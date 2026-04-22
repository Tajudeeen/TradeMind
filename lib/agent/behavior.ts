/**
 * Behavior Learning Engine
 *
 * Extracts behavioral signals from user input and updates memory.
 * This is what makes TradeMind feel like it "learns" — not just
 * a chatbot, but a system that tracks cognitive patterns over time.
 */

import { AgentMemory, BehaviorTag, TradeRecord } from "@/types";

interface BehaviorSignal {
  tag: string;
  description: string;
  risk_hint?: "conservative" | "moderate" | "aggressive";
}

const SIGNAL_PATTERNS: Array<{
  patterns: RegExp[];
  signal: BehaviorSignal;
}> = [
  {
    patterns: [
      /too late/i,
      /missed (it|the move)/i,
      /already pumped/i,
      /already ran/i,
    ],
    signal: {
      tag: "late_entry_anxiety",
      description: "Tends to worry about missing moves",
      risk_hint: "aggressive",
    },
  },
  {
    patterns: [/fomo/i, /everyone (is|is buying)/i, /going crazy/i, /moon/i],
    signal: {
      tag: "fomo_driven",
      description: "Shows FOMO tendencies in volatile markets",
      risk_hint: "aggressive",
    },
  },
  {
    patterns: [/safe/i, /risky/i, /too risky/i, /scared/i, /worried/i],
    signal: {
      tag: "risk_averse",
      description: "Frequently weighs safety before action",
      risk_hint: "conservative",
    },
  },
  {
    patterns: [/sell.*all/i, /exit.*all/i, /panic/i, /crashing/i, /dump/i],
    signal: {
      tag: "panic_seller",
      description: "Reacts to downturns with sell impulses",
      risk_hint: "conservative",
    },
  },
  {
    patterns: [/all in/i, /max position/i, /double down/i, /ape/i],
    signal: {
      tag: "high_conviction",
      description: "Prefers concentrated, high-conviction bets",
      risk_hint: "aggressive",
    },
  },
  {
    patterns: [/dca/i, /average (in|down)/i, /gradually/i, /scale in/i],
    signal: {
      tag: "methodical_accumulator",
      description: "Prefers systematic, gradual entry strategies",
      risk_hint: "moderate",
    },
  },
  {
    patterns: [/short/i, /put/i, /bear/i, /overvalued/i, /bubble/i],
    signal: {
      tag: "bearish_tendency",
      description: "Often looks for short or hedging opportunities",
      risk_hint: "moderate",
    },
  },
  {
    patterns: [/hold/i, /hodl/i, /long term/i, /patience/i],
    signal: {
      tag: "long_term_holder",
      description: "Tends to favor long-term holding over trading",
      risk_hint: "conservative",
    },
  },
];

export function extractBehaviorSignals(userInput: string): BehaviorSignal[] {
  const found: BehaviorSignal[] = [];
  for (const { patterns, signal } of SIGNAL_PATTERNS) {
    if (patterns.some((p) => p.test(userInput))) {
      found.push(signal);
    }
  }
  return found;
}

export function updateBehaviorTags(
  memory: AgentMemory,
  signals: BehaviorSignal[]
): AgentMemory {
  for (const signal of signals) {
    const existing = memory.user_behavior.find((b) => b.tag === signal.tag);
    if (existing) {
      existing.count++;
      existing.last_seen = new Date().toISOString();
    } else {
      memory.user_behavior.push({
        tag: signal.tag,
        count: 1,
        last_seen: new Date().toISOString(),
        description: signal.description,
      });
    }

    // Update risk profile based on accumulated signals
    if (signal.risk_hint) {
      memory.risk_profile = inferRiskProfile(memory);
    }
  }
  return memory;
}

function inferRiskProfile(
  memory: AgentMemory
): AgentMemory["risk_profile"] {
  const aggressiveTags = ["fomo_driven", "late_entry_anxiety", "high_conviction"];
  const conservativeTags = ["risk_averse", "panic_seller", "long_term_holder"];
  const moderateTags = ["methodical_accumulator", "bearish_tendency"];

  let aScore = 0, cScore = 0, mScore = 0;
  for (const b of memory.user_behavior) {
    if (aggressiveTags.includes(b.tag)) aScore += b.count;
    if (conservativeTags.includes(b.tag)) cScore += b.count;
    if (moderateTags.includes(b.tag)) mScore += b.count;
  }

  const max = Math.max(aScore, cScore, mScore);
  if (max === 0) return "unknown";
  if (aScore === max) return "aggressive";
  if (cScore === max) return "conservative";
  return "moderate";
}

export function logTradeSimulation(
  memory: AgentMemory,
  trade: Omit<TradeRecord, "id" | "timestamp">
): AgentMemory {
  const record: TradeRecord = {
    ...trade,
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
  };
  memory.trade_history = [record, ...memory.trade_history].slice(0, 50);
  return memory;
}

export function buildBehaviorContext(memory: AgentMemory): string {
  if (memory.user_behavior.length === 0) return "";

  const top = [...memory.user_behavior]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lines = top.map(
    (b) => `- ${b.tag} (seen ${b.count}x): ${b.description}`
  );

  return `
OBSERVED BEHAVIOR PATTERNS:
${lines.join("\n")}
Risk profile: ${memory.risk_profile}
Total interactions: ${memory.interaction_count}
Past simulated trades: ${memory.trade_history.length}
${memory.notes.length > 0 ? `\nAgent notes:\n${memory.notes.slice(0, 3).map((n) => `- ${n}`).join("\n")}` : ""}
`.trim();
}