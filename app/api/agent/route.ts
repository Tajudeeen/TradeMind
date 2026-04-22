import { NextRequest, NextResponse } from "next/server";
import { processAgentMessage } from "@/lib/agent";
import { readMemory, resetMemory } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId and message are required" },
        { status: 400 }
      );
    }

    const response = await processAgentMessage(userId, message);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: "Agent processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (action === "reset") {
    const memory = await resetMemory(userId);
    return NextResponse.json({ memory });
  }

  const memory = await readMemory(userId);
  return NextResponse.json({ memory });
}