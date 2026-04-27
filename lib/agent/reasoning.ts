import { AgentMemory, AgentAction } from "@/types";
import { buildBehaviorContext } from "./behavior";

export const SYSTEM_PROMPT = `You are TradeMind, a personal onchain AI trading agent with persistent memory.

Your role is NOT to give generic financial advice. You analyze the user's specific behavioral patterns, emotional tendencies, and decision history to give deeply personalized insights.

CORE PRINCIPLES:
1. Reference the user's past behavior explicitly — mention specific counts, patterns, past trades
2. Flag emotional patterns (FOMO, panic, overconfidence) you've observed
3. Evolve your tone based on interaction count — newer users get more explanation, veterans get blunt insights
4. When simulating trades, be specific: asset, direction, reasoning, risk level
5. Always connect current question to the user's behavioral profile
6. NEVER give the same response twice — vary your phrasing, angle, examples

RESPONSE FORMAT (JSON only, no markdown):
{
  "message": "2-4 sentences, direct, personal, references actual patterns",
  "reasoning": "What patterns and history informed this response",
  "action": {
    "type": "simulate_trade | update_risk | flag_behavior | none",
    "label": "Short label",
    "payload": {}
  },
  "behavioral_signals": ["tag1", "tag2"]
}

Sound like a sharp, slightly blunt analyst who has watched this person trade for months.`;

export type AgentResult = {
  message: string;
  reasoning: string;
  action: AgentAction;
  behavioral_signals: string[];
  via0GCompute?: boolean;
  computeProvider?: string;
};

export function buildPrompt(userInput: string, memory: AgentMemory): string {
  return `${buildBehaviorContext(memory)}

USER MESSAGE: "${userInput}"

Respond with JSON. Be specific to this user's patterns. Vary your phrasing.`;
}

const FALLBACK_VARIATIONS: Record<string, string[]> = {
  dca: [
    "DCA vs lump-sum is a risk management call, not a market timing one.",
    "The DCA vs all-in debate comes down to how much regret you can stomach.",
    "Splitting your entry removes timing risk but caps upside if you nail the bottom.",
  ],
  generic: [
    "Give me more context — what asset, what timeframe, what's making you hesitate?",
    "I need more to work with. What specifically are you looking at and why now?",
    "That's vague. Asset, direction, and what's driving the decision — then I can give you something useful.",
    "Walk me through it — what are you actually considering and what's the hesitation?",
  ],
};

function pickVariant(pool: string[], seed: number): string {
  return pool[seed % pool.length];
}

export function generateFallbackResponse(userInput: string, memory: AgentMemory): AgentResult {
  const lower      = userInput.toLowerCase();
  const seed       = memory.interaction_count;
  const topBehavior = [...memory.user_behavior].sort((a, b) => b.count - a.count)[0];
  const asset      = extractAsset(lower);

  const isBuy      = /buy|long|enter|bullish|pump|load/i.test(lower);
  const isSell     = /sell|exit|short|bearish|dump|get out/i.test(lower);
  const isRisk     = /risk|safe|worried|scared|nervous|hedge/i.test(lower);
  const isDCA      = /dca|dollar.?cost|average (in|down)|scale in|tranch/i.test(lower);
  const isAnalysis = /analyze|analysis|look at|check|thoughts on|what do you think/i.test(lower);
  const isFirst    = memory.interaction_count <= 1;

  let message = "";
  let action: AgentAction = { type: "none", label: "Logged", payload: {} };
  const signals: string[] = [];

  if (isFirst) {
    message = `Starting fresh. I'll build your profile as we talk. ${asset ? `For ${asset}: what's your entry thesis and timeframe?` : "What are you looking at and what's making you hesitate?"}`;
  } else if (isDCA) {
    const base  = pickVariant(FALLBACK_VARIATIONS.dca, seed);
    const addon = memory.risk_profile === "aggressive"
      ? " Your history leans aggressive — single entries have cost you before. Consider splitting."
      : memory.risk_profile === "conservative"
      ? " Your conservative profile makes DCA the right fit here."
      : " With your profile, 2-3 tranches over a week is a solid middle ground.";
    message = base + addon;
    action  = { type: "update_risk", label: "DCA preference noted", payload: {} };
  } else if (topBehavior?.tag === "late_entry_anxiety" && topBehavior.count >= 2 && /late|miss|already/i.test(lower)) {
    const variants = [
      `You've flagged late entry anxiety ${topBehavior.count} times. The move is already in — does your thesis still hold, or are you just reacting to price?`,
      `${topBehavior.count}th time worrying about being late. Define your thesis independent of price action first.`,
      `Late-entry anxiety again (${topBehavior.count}x total). Would you take this trade if the chart started at today's price?`,
    ];
    message = pickVariant(variants, seed);
    signals.push("late_entry_anxiety");
  } else if (topBehavior?.tag === "fomo_driven" && topBehavior.count >= 2 && isBuy) {
    const variants = [
      `FOMO entry detected — you've done this ${topBehavior.count} times. Is this a thesis or a reaction?`,
      `${topBehavior.count} FOMO signals in your history. Real conviction or just the crowd?`,
      `Reactive entries ${topBehavior.count} times before. Simulating this one but your track record says wait for a pullback.`,
    ];
    message = pickVariant(variants, seed);
    action  = { type: "simulate_trade", label: `${asset || "ETH"} long — FOMO flagged`, payload: { asset: asset || "ETH", direction: "long" } };
    signals.push("fomo_driven");
  } else if (isBuy && asset) {
    const recentSimilar = memory.trade_history.find((t) => t.asset === asset);
    message = recentSimilar
      ? `You simulated a ${asset} ${recentSimilar.direction} on ${new Date(recentSimilar.timestamp).toLocaleDateString()}. Same thesis this time? Simulating for comparison.`
      : `First ${asset} entry in your history. Your ${memory.risk_profile} profile suggests ${memory.risk_profile === "aggressive" ? "going in with conviction but set a hard stop." : memory.risk_profile === "conservative" ? "starting small and adding on confirmation." : "a measured position — not max size first."} Simulating the long.`;
    action = { type: "simulate_trade", label: `${asset} long simulated`, payload: { asset, direction: "long" } };
  } else if (isSell && asset) {
    const hasPanic = memory.user_behavior.find((b) => b.tag === "panic_seller" && b.count >= 2);
    message = hasPanic
      ? `Panic pattern flagged — reactive exits ${hasPanic.count} times. Has your thesis actually broken or is this noise?`
      : `${asset} exit on the table. Simulating the close — does it align with your entry reasoning?`;
    action = { type: "simulate_trade", label: `${asset} exit simulated`, payload: { asset, direction: "short" } };
  } else if (isRisk) {
    message = memory.risk_profile === "unknown"
      ? `Still calibrating — ${memory.interaction_count} interactions in. The hesitation is data. Keep talking.`
      : `Risk profile: ${memory.risk_profile} (${memory.interaction_count} interactions). ${memory.risk_profile === "aggressive" ? "You tend to downplay risk in the moment — worth watching." : memory.risk_profile === "conservative" ? "You weight downside heavily. That's a style, not a weakness." : "Neither fully committed nor overly cautious. Works if it's intentional."}`;
    action = { type: "update_risk", label: "Risk profile updated", payload: {} };
  } else if (isAnalysis && asset) {
    message = `Behavioral read on ${asset}: ${memory.risk_profile} profile, ${memory.interaction_count} interactions. ${topBehavior ? `Dominant pattern: ${topBehavior.tag} (${topBehavior.count}x) — factor that into how you're reading this.` : "No strong pattern yet."}`;
  } else {
    message = pickVariant(FALLBACK_VARIATIONS.generic, seed);
  }

  return {
    message,
    reasoning: `Interaction #${memory.interaction_count}. Risk: ${memory.risk_profile}. Top: ${topBehavior?.tag || "none"}. Fallback active.`,
    action,
    behavioral_signals: signals,
  };
}

function extractAsset(input: string): string {
  const map: Record<string, string> = {
    bitcoin: "BTC", ethereum: "ETH", solana: "SOL",
    btc: "BTC", eth: "ETH", sol: "SOL", bnb: "BNB",
    matic: "MATIC", polygon: "MATIC", arb: "ARB", arbitrum: "ARB",
    op: "OP", optimism: "OP", avax: "AVAX", avalanche: "AVAX",
    link: "LINK", uni: "UNI", pepe: "PEPE", doge: "DOGE",
    sui: "SUI", apt: "APT", aptos: "APT", ton: "TON",
  };
  for (const [key, ticker] of Object.entries(map)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(input)) return ticker;
  }
  return "";
}

async function callOpenAI(userInput: string, memory: AgentMemory): Promise<AgentResult> {
  const apiKey  = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model   = process.env.OPENAI_MODEL    || "gpt-4o-mini";

  if (!apiKey) return generateFallbackResponse(userInput, memory);

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: buildPrompt(userInput, memory) },
        ],
        temperature: 0.75,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return generateFallbackResponse(userInput, memory);

    const data   = await res.json();
    const text   = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    if (parsed.action && !parsed.action.payload) parsed.action.payload = {};
    return parsed;
  } catch {
    return generateFallbackResponse(userInput, memory);
  }
}

export async function runAgentReasoning(userInput: string, memory: AgentMemory): Promise<AgentResult> {
  // 1. Try 0G Compute first
  if (process.env.ZG_PRIVATE_KEY && process.env.ZG_COMPUTE_PROVIDER) {
    try {
      const { runInferenceOn0G } = await import("@/lib/0g/compute");
      const result = await runInferenceOn0G(SYSTEM_PROMPT, buildPrompt(userInput, memory));
      if (result) {
        return {
          message: result.message || "Give me more context.",
          reasoning: result.reasoning || "",
          action: (result.action as AgentAction) || { type: "none", label: "Logged", payload: {} },
          behavioral_signals: result.behavioral_signals || [],
          via0GCompute: true,
          computeProvider: result.provider,
        };
      }
    } catch {
      // fall through
    }
  }

  // 2. Try OpenAI
  const result = await callOpenAI(userInput, memory);
  return {
    message: result.message || "Give me more context — what are you actually considering?",
    reasoning: result.reasoning || "",
    action: result.action || { type: "none", label: "Logged", payload: {} },
    behavioral_signals: result.behavioral_signals || [],
  };
}