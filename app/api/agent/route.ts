import { NextRequest, NextResponse } from "next/server";
import { processAgentMessage } from "@/lib/agent";
import { defaultMemory } from "@/lib/storage";

const MAX_MESSAGE_LENGTH = 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
    }

    const body = await req.json();
    const { userId, message, memory } = body;

    if (!userId || typeof userId !== "string" || userId.length > 100) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const trimmed = message.trim();

    if (trimmed.length < 1) {
      return NextResponse.json({ error: "Message is too short" }, { status: 400 });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long. Max ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const seedMemory = memory || defaultMemory(userId);
    const response = await processAgentMessage(userId, trimmed, seedMemory);
    return NextResponse.json(response);

  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[TradeMind Error]", detail);
    return NextResponse.json(
      { error: "Agent is temporarily unavailable. Try again in a moment." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("debug") === "1" && process.env.NODE_ENV !== "production") {
    try {
      const result = await processAgentMessage(
        "debug-user",
        "should I DCA or enter all at once?",
        defaultMemory("debug-user")
      );
      return NextResponse.json({ ok: true, message: result.message });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, error: detail });
    }
  }

  return NextResponse.json({ ok: true, status: "TradeMind API running" });
}