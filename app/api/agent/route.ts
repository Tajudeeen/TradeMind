import { NextRequest, NextResponse } from "next/server";
import { processAgentMessage } from "@/lib/agent";
import { defaultMemory } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message, memory } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId and message are required" },
        { status: 400 }
      );
    }

    const seedMemory = memory || defaultMemory(userId);

    const response = await processAgentMessage(userId, message, seedMemory);
    return NextResponse.json(response);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 6).join("\n") : "";
    console.error("[TradeMind Error]", detail);
    console.error(stack);
    return NextResponse.json(
      { error: "Agent processing failed", detail },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("debug") === "1") {
    try {
      const result = await processAgentMessage(
        "debug-user",
        "should I DCA or enter all at once?",
        defaultMemory("debug-user")
      );
      return NextResponse.json({ ok: true, message: result.message });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 8) : [];
      return NextResponse.json({ ok: false, error: detail, stack });
    }
  }

  return NextResponse.json({ ok: true, status: "TradeMind API running" });
}