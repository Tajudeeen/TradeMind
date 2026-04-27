import { NextRequest, NextResponse } from "next/server";
import { readMemoryFrom0G, defaultMemory } from "@/lib/storage";
import { AgentMemory } from "@/types";

export interface PublicProfile {
  userId: string;
  risk_profile: string;
  interaction_count: number;
  user_behavior: {
    tag: string;
    count: number;
    last_seen: string;
    description: string;
  }[];
  trade_stats: {
    total: number;
    assets: string[];
    directions: { long: number; short: number; hold: number };
  };
  last_updated: string;
  zg_root_hash?: string;
  zg_tx_hash?: string;
  verified: boolean;
}

function buildPublicProfile(memory: AgentMemory): PublicProfile {
  const directions = { long: 0, short: 0, hold: 0 };
  const assetSet = new Set<string>();

  for (const t of memory.trade_history) {
    directions[t.direction] = (directions[t.direction] || 0) + 1;
    assetSet.add(t.asset);
  }

  return {
    userId: memory.userId,
    risk_profile: memory.risk_profile,
    interaction_count: memory.interaction_count,
    user_behavior: [...memory.user_behavior]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    trade_stats: {
      total: memory.trade_history.length,
      assets: Array.from(assetSet),
      directions,
    },
    last_updated: memory.last_updated,
    zg_root_hash: memory.zg_root_hash,
    zg_tx_hash: memory.zg_tx_hash,
    verified: !!memory.zg_root_hash,
  };
}

// GET — read profile (from 0G or returns empty)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId || userId.length > 100) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  let memory: AgentMemory | null = null;

  if (process.env.ZG_PRIVATE_KEY) {
    memory = await readMemoryFrom0G(userId);
  }

  if (!memory) memory = defaultMemory(userId);

  return NextResponse.json(buildPublicProfile(memory), {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}

// POST — publish profile snapshot (client sends their localStorage memory)
// This lets users without 0G still have a shareable profile stored server-side
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, memory } = body;

    if (!userId || !memory || typeof memory !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (userId.length > 100) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Sanitize — only keep safe fields, strip notes and raw inputs
    const safe: AgentMemory = {
      userId,
      risk_profile: memory.risk_profile || "unknown",
      user_behavior: (memory.user_behavior || []).slice(0, 20),
      trade_history: (memory.trade_history || []).map((t: AgentMemory["trade_history"][0]) => ({
        id: t.id,
        timestamp: t.timestamp,
        asset: t.asset,
        direction: t.direction,
        reasoning: t.reasoning?.slice(0, 200) || "",
        user_input: "", // stripped
        simulated: true,
        outcome: t.outcome,
      })),
      notes: [], // stripped
      interaction_count: memory.interaction_count || 0,
      last_updated: new Date().toISOString(),
      zg_root_hash: memory.zg_root_hash,
      zg_tx_hash: memory.zg_tx_hash,
    };

    // Store in server-side cache (survives for the session)
    profileCache.set(userId, safe);

    return NextResponse.json(buildPublicProfile(safe));
  } catch (err) {
    return NextResponse.json({ error: "Failed to publish profile" }, { status: 500 });
  }
}

// Server-side profile cache — fallback when 0G not configured
// Persists for server lifetime, cleared on redeploy
const profileCache = new Map<string, AgentMemory>();