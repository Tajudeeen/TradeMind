import { AgentMemory, BehaviorTag, TradeRecord } from "@/types";

interface BehaviorSignal {
  tag: string;
  description: string;
  risk_hint?: "conservative" | "moderate" | "aggressive";
}

const SIGNAL_PATTERNS: Array<{ patterns: RegExp[]; signal: BehaviorSignal }> = [
  {
    patterns: [
      /too late/i, /missed (it|the move|out|the pump)/i, /already (pumped|ran|mooned|up|moved)/i,
      /should.?ve (bought|entered|gotten in)/i, /wish i (bought|entered)/i, /why didn.?t i/i,
      /it.?s (already )?up \d/i, /been running/i, /left behind/i,
    ],
    signal: { tag: "late_entry_anxiety", description: "Tends to worry about missing moves", risk_hint: "aggressive" },
  },
  {
    patterns: [
      /fomo/i, /everyone (is |are )?(buying|getting in|loading)/i, /going (crazy|parabolic|insane)/i,
      /can.?t miss (this|it)/i, /fear of missing/i, /my friend(s)? (bought|made)/i,
      /twitter (is )?saying/i, /trending/i, /everyone.?s talking/i, /hype/i,
    ],
    signal: { tag: "fomo_driven", description: "Shows FOMO tendencies in volatile markets", risk_hint: "aggressive" },
  },
  {
    patterns: [
      /too risky/i, /scared/i, /worried/i, /nervous/i, /not sure/i, /should i be (concerned|worried)/i,
      /feels (risky|dangerous|wrong)/i, /is it safe/i, /what if (it drops|it crashes|i lose)/i,
      /downside/i, /protect/i, /hedge/i, /stop loss/i,
    ],
    signal: { tag: "risk_averse", description: "Frequently weighs safety before action", risk_hint: "conservative" },
  },
  {
    patterns: [
      /sell (it )?all/i, /exit (everything|all|now)/i, /panic/i, /crashing/i, /dump(ing)?/i,
      /get out (now|fast|quick)/i, /cut (my )?loss/i, /it.?s over/i, /going to zero/i,
      /market (is )?crashing/i, /blood(bath)?/i,
    ],
    signal: { tag: "panic_seller", description: "Reacts to downturns with sell impulses", risk_hint: "conservative" },
  },
  {
    patterns: [
      /all in/i, /max (position|size|leverage)/i, /double down/i, /ape (in)?/i,
      /yolo/i, /full (send|port)/i, /bet (it )?all/i, /putting everything/i, /going big/i,
    ],
    signal: { tag: "high_conviction", description: "Prefers concentrated, high-conviction bets", risk_hint: "aggressive" },
  },
  {
    patterns: [
      /dca/i, /dollar.?cost/i, /average (in|down|into)/i, /gradually/i, /scale (in|into)/i,
      /buy (in )?tranches/i, /spread (it )?out/i, /over time/i, /weekly (buy|purchase)/i,
    ],
    signal: { tag: "methodical_accumulator", description: "Prefers systematic, gradual entry strategies", risk_hint: "moderate" },
  },
  {
    patterns: [
      /short/i, /put option/i, /bear(ish)?/i, /overvalued/i, /bubble/i,
      /going down/i, /top (is )?in/i, /time to (short|sell)/i, /fade/i, /resistance/i,
    ],
    signal: { tag: "bearish_tendency", description: "Often looks for short or hedging opportunities", risk_hint: "moderate" },
  },
  {
    patterns: [
      /hold/i, /hodl/i, /long.?term/i, /patience/i, /years/i,
      /not selling/i, /keep holding/i, /accumulate/i, /conviction/i, /fundamentals/i,
    ],
    signal: { tag: "long_term_holder", description: "Tends to favor long-term holding over trading", risk_hint: "conservative" },
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

export function updateBehaviorTags(memory: AgentMemory, signals: BehaviorSignal[]): AgentMemory {
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
  }
  memory.risk_profile = inferRiskProfile(memory);
  return memory;
}

function inferRiskProfile(memory: AgentMemory): AgentMemory["risk_profile"] {
  const aggressiveTags = ["fomo_driven", "late_entry_anxiety", "high_conviction"];
  const conservativeTags = ["risk_averse", "panic_seller", "long_term_holder"];
  const moderateTags = ["methodical_accumulator", "bearish_tendency"];

  const now = Date.now();
  let aScore = 0, cScore = 0, mScore = 0;

  for (const b of memory.user_behavior) {
    const ageDays = (now - new Date(b.last_seen).getTime()) / (1000 * 60 * 60 * 24);
    const decay = ageDays > 90 ? 0.25 : ageDays > 30 ? 0.5 : 1;
    const weight = b.count * decay;

    if (aggressiveTags.includes(b.tag)) aScore += weight;
    if (conservativeTags.includes(b.tag)) cScore += weight;
    if (moderateTags.includes(b.tag)) mScore += weight;
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
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
  };
  memory.trade_history = [record, ...memory.trade_history].slice(0, 50);
  return memory;
}

export function buildBehaviorContext(memory: AgentMemory): string {
  const top = [...memory.user_behavior].sort((a, b) => b.count - a.count).slice(0, 5);
  const recentTrades = memory.trade_history.slice(0, 3);

  const behaviorLines = top.length > 0
    ? `OBSERVED BEHAVIOR PATTERNS:\n${top.map((b) => `- ${b.tag} (${b.count}x): ${b.description}`).join("\n")}`
    : "BEHAVIOR PATTERNS: None detected yet.";

  const tradeLines = recentTrades.length > 0
    ? `\nRECENT SIMULATED TRADES:\n${recentTrades.map((t) =>
        `- ${t.asset} ${t.direction} on ${new Date(t.timestamp).toLocaleDateString()}: ${t.reasoning.slice(0, 100)}`
      ).join("\n")}`
    : "";

  return `${behaviorLines}
Risk profile: ${memory.risk_profile}
Total interactions: ${memory.interaction_count}
${tradeLines}
${memory.notes.length > 0 ? `\nAgent notes:\n${memory.notes.slice(0, 3).map((n) => `- ${n}`).join("\n")}` : ""}`.trim();
}