import { AgentMemory, AgentAction } from "@/types";
import { buildBehaviorContext } from "./behavior";

const SYSTEM_PROMPT = `You are TradeMind, a personal onchain AI trading agent with persistent memory.

Your role is NOT to give generic financial advice. You analyze the user's specific behavioral patterns, emotional tendencies, and decision history to give deeply personalized insights.

CORE PRINCIPLES:
1. Reference the user's past behavior explicitly when relevant — mention specific counts, patterns, and past trades
2. Flag emotional patterns (FOMO, panic, overconfidence) you've observed
3. Evolve your tone based on interaction count — newer users get more explanation, veterans get direct, blunt insights
4. When simulating trades, be specific: asset, direction, reasoning, risk level
5. Always connect current question to the user's behavioral profile
6. NEVER give the same response twice — vary your phrasing, angle, and examples

RESPONSE FORMAT (JSON only, no markdown):
{
  "message": "Your response — 2-4 sentences, direct, personal, references their actual patterns",
  "reasoning": "What patterns and history informed this response",
  "action": {
    "type": "simulate_trade | update_risk | flag_behavior | none",
    "label": "Short label for the action taken",
    "payload": {}
  },
  "behavioral_signals": ["tag1", "tag2"]
}

Avoid generic phrases like 'great question' or 'as an AI'. Sound like a sharp, slightly blunt analyst who has watched this person trade for months.`;

type AgentResult = {
  message: string;
  reasoning: string;
  action: AgentAction;
  behavioral_signals: string[];
};

function buildPrompt(userInput: string, memory: AgentMemory): string {
  return `${buildBehaviorContext(memory)}

USER MESSAGE: "${userInput}"

Respond with JSON. Be specific to this user's patterns. Vary your phrasing from previous responses.`;
}

const FALLBACK_VARIATIONS: Record<string, string[]> = {
  dca: [
    "DCA vs lump-sum is a risk management call, not a market timing one.",
    "The DCA vs all-in debate comes down to how much regret you can stomach.",
    "Splitting your entry removes timing risk but also caps upside if you nail the bottom.",
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

function generateFallbackResponse(userInput: string, memory: AgentMemory): AgentResult {
  const lower = userInput.toLowerCase();
  const seed = memory.interaction_count;
  const topBehavior = [...memory.user_behavior].sort((a, b) => b.count - a.count)[0];
  const asset = extractAsset(lower);

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
    message = `Starting fresh. I'll build your profile as we talk — the more context you give me, the more specific I get. ${
      asset
        ? `For ${asset} specifically: what's your entry thesis and what timeframe are you thinking?`
        : "What are you looking at and what's making you hesitate?"
    }`;

  } else if (isDCA) {
    const base = pickVariant(FALLBACK_VARIATIONS.dca, seed);
    const addon =
      memory.risk_profile === "aggressive"
        ? " Your history leans aggressive — single entries have cost you before. Consider splitting it."
        : memory.risk_profile === "conservative"
        ? " Given your conservative profile, DCA is the right fit here."
        : " With your profile, 2-3 tranches over a week is a reasonable middle ground.";
    message = base + addon;
    action = { type: "update_risk", label: "DCA preference noted", payload: {} };

  } else if (topBehavior?.tag === "late_entry_anxiety" && topBehavior.count >= 2 && /late|miss|already/i.test(lower)) {
    const variants = [
      `You've flagged late entry anxiety ${topBehavior.count} times now. The move is already in — the real question is whether your original thesis still holds, not whether you missed the first leg.`,
      `This is the ${topBehavior.count}th time you've worried about being late. Define your thesis independent of price action first, then decide.`,
      `Late-entry anxiety again — ${topBehavior.count} times total. Ask yourself: would you take this trade if the chart started at today's price? That's your answer.`,
    ];
    message = pickVariant(variants, seed);
    signals.push("late_entry_anxiety");

  } else if (topBehavior?.tag === "fomo_driven" && topBehavior.count >= 2 && isBuy) {
    const variants = [
      `FOMO entry detected — you've done this ${topBehavior.count} times. I'm simulating the position but flagging it: is this a thesis or a reaction?`,
      `${topBehavior.count} FOMO signals in your history. This might be real conviction or it might be the crowd — which one is it this time?`,
      `You've made reactive entries ${topBehavior.count} times before. Simulating this one, but your track record here says to wait for a pullback.`,
    ];
    message = pickVariant(variants, seed);
    action = { type: "simulate_trade", label: `${asset || "ETH"} long — FOMO flagged`, payload: { asset: asset || "ETH", direction: "long" } };
    signals.push("fomo_driven");

  } else if (isBuy && asset) {
    const recentSimilar = memory.trade_history.filter((t) => t.asset === asset)[0];
    if (recentSimilar) {
      message = `You've simulated a ${asset} ${recentSimilar.direction} before on ${new Date(recentSimilar.timestamp).toLocaleDateString()}. Same thesis this time? Simulating the entry for comparison.`;
    } else {
      message = `First ${asset} entry in your history. Your ${memory.risk_profile} profile suggests ${
        memory.risk_profile === "aggressive"
          ? "going in with conviction but setting a hard stop."
          : memory.risk_profile === "conservative"
          ? "starting small and adding on confirmation."
          : "a measured position — not max size on the first entry."
      } Simulating the long.`;
    }
    action = { type: "simulate_trade", label: `${asset} long simulated`, payload: { asset, direction: "long" } };

  } else if (isSell && asset) {
    const hasPanic = memory.user_behavior.find((b) => b.tag === "panic_seller" && b.count >= 2);
    if (hasPanic) {
      message = `Panic pattern flagged — you've done reactive exits ${hasPanic.count} times. Before you sell: has your original thesis actually broken, or is this price action noise?`;
    } else {
      message = `${asset} exit on the table. Simulating the position close — check if this aligns with your entry reasoning or if something changed.`;
    }
    action = { type: "simulate_trade", label: `${asset} exit simulated`, payload: { asset, direction: "short" } };

  } else if (isRisk) {
    message =
      memory.risk_profile === "unknown"
        ? `Your risk profile is still calibrating — ${memory.interaction_count} interactions in. The hesitation you're describing is data. Keep talking.`
        : `Your risk profile reads as ${memory.risk_profile} based on ${memory.interaction_count} interactions. ${
            memory.risk_profile === "aggressive"
              ? "You tend to downplay risk in the moment — that pattern is worth watching."
              : memory.risk_profile === "conservative"
              ? "You consistently weight downside heavily. That's not weakness, it's a style."
              : "You're in the middle — neither fully committed nor overly cautious. That can work if it's intentional."
          }`;
    action = { type: "update_risk", label: "Risk profile updated", payload: {} };

  } else if (isAnalysis && asset) {
    message = `Behavioral read on ${asset}: with your ${memory.risk_profile} profile and ${memory.interaction_count} past interactions, ${
      topBehavior
        ? `your dominant pattern is ${topBehavior.tag} (${topBehavior.count}x) — factor that into how you're reading this chart.`
        : "no strong pattern has emerged yet. More data needed."
    }`;

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
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) return generateFallbackResponse(userInput, memory);

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(userInput, memory) },
        ],
        temperature: 0.75,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return generateFallbackResponse(userInput, memory);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    if (parsed.action && !parsed.action.payload) parsed.action.payload = {};
    return parsed;
  } catch {
    return generateFallbackResponse(userInput, memory);
  }
}

export async function runAgentReasoning(userInput: string, memory: AgentMemory): Promise<AgentResult> {
  const result = await callOpenAI(userInput, memory);
  return {
    message: result.message || "Give me more context — what are you actually considering?",
    reasoning: result.reasoning || "",
    action: result.action || { type: "none", label: "Logged", payload: {} },
    behavioral_signals: result.behavioral_signals || [],
  };
}