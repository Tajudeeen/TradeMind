/**
 * AI Reasoning Layer
 *
 * Constructs structured prompts combining user input + persistent memory,
 * then calls an OpenAI-compatible endpoint (fallback to mock if no key).
 * The agent's job is to analyze BEHAVIOR patterns, not just answer questions.
 */

import { AgentMemory, AgentResponse, AgentAction } from "@/types";
import { buildBehaviorContext } from "./behavior";

const SYSTEM_PROMPT = `You are TradeMind, a personal onchain AI trading agent with persistent memory.

Your role is NOT to give generic financial advice. You analyze the user's specific behavioral patterns, emotional tendencies, and decision history to give deeply personalized insights.

CORE PRINCIPLES:
1. Reference the user's past behavior explicitly when relevant
2. Flag emotional patterns (FOMO, panic, overconfidence) you've observed
3. Evolve your tone based on interaction count — newer users get more explanation, repeat users get direct insights
4. When simulating trades, be specific: asset, direction, reasoning, risk assessment
5. Always connect current question to behavioral profile

RESPONSE FORMAT (JSON only, no markdown):
{
  "message": "Your main response to the user (1-4 sentences, direct and personal)",
  "reasoning": "Internal chain-of-thought: what patterns informed this response",
  "action": {
    "type": "simulate_trade | update_risk | flag_behavior | none",
    "label": "Short description of what action was taken",
    "payload": {}
  },
  "behavioral_signals": ["tag1", "tag2"]
}

Keep responses concise but high-signal. Avoid generic disclaimers. Sound like a sharp analyst who knows this person.`;

function buildPrompt(userInput: string, memory: AgentMemory): string {
  const behaviorCtx = buildBehaviorContext(memory);
  const recentTrades = memory.trade_history.slice(0, 3);
  const tradeCtx =
    recentTrades.length > 0
      ? `\nRECENT SIMULATED TRADES:\n${recentTrades
          .map(
            (t) =>
              `- ${t.asset} ${t.direction} (${new Date(t.timestamp).toLocaleDateString()}): ${t.reasoning}`
          )
          .join("\n")}`
      : "";

  return `${behaviorCtx}${tradeCtx}

USER MESSAGE: "${userInput}"

Respond with JSON as specified. Be specific to this user's patterns.`;
}

async function callOpenAI(
  prompt: string,
  memory: AgentMemory
): Promise<{ message: string; reasoning: string; action: AgentAction; behavioral_signals: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return generateFallbackResponse(prompt, memory);
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error:", response.status);
    return generateFallbackResponse(prompt, memory);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(text);
  } catch {
    return generateFallbackResponse(prompt, memory);
  }
}

// Deterministic fallback when no API key is set — still feels adaptive
function generateFallbackResponse(
  prompt: string,
  memory: AgentMemory
): { message: string; reasoning: string; action: AgentAction; behavioral_signals: string[] } {
  const lower = prompt.toLowerCase();
  const isFirstInteraction = memory.interaction_count <= 1;
  const topBehavior = [...memory.user_behavior].sort((a, b) => b.count - a.count)[0];

  // Detect what the user is asking about
  const isBuy = /buy|long|enter|bullish|pump/.test(lower);
  const isSell = /sell|exit|short|bearish|dump/.test(lower);
  const isRisk = /risk|safe|worried|scared/.test(lower);
  const isAnalysis = /analyze|analysis|look at|check/.test(lower);
  const asset = extractAsset(lower);

  let message = "";
  let action: AgentAction = { type: "none", label: "No action" };
  const signals: string[] = [];

  if (isFirstInteraction) {
    message = `Welcome. I'm building your behavioral profile now. ${
      asset
        ? `For ${asset}: `
        : ""
    }I need a few more data points before I can give you pattern-based insights. What's your typical position sizing on a trade like this?`;
  } else if (topBehavior?.tag === "late_entry_anxiety" && /late|miss/i.test(lower)) {
    message = `You've shown late-entry anxiety ${topBehavior.count} times now. This is a known pattern in your history. The question isn't whether you missed the move — it's whether you're about to make a reactive entry again. What was your original thesis on ${asset || "this"}?`;
    signals.push("late_entry_anxiety");
  } else if (topBehavior?.tag === "fomo_driven" && isBuy) {
    message = `FOMO signal detected. You've had similar impulses ${topBehavior.count} times. Your ${memory.risk_profile} profile suggests this might be a reactive trade, not a planned one. I'll simulate the entry — but flag this for review.`;
    action = { type: "simulate_trade", label: `Simulated ${asset || "ETH"} long (FOMO flagged)`, payload: { asset: asset || "ETH", direction: "long" } };
    signals.push("fomo_driven");
  } else if (isBuy && asset) {
    message = `Based on your ${memory.risk_profile} profile and ${memory.interaction_count} interactions, a position in ${asset} aligns with your typical strategy. I'm simulating a long entry with a tight stop for your review.`;
    action = { type: "simulate_trade", label: `Simulated ${asset} long`, payload: { asset, direction: "long" } };
  } else if (isSell && asset) {
    const hasPanicPattern = memory.user_behavior.some((b) => b.tag === "panic_seller" && b.count > 1);
    message = `${hasPanicPattern ? "This looks like a panic reaction — you've done this before." : `A ${asset} exit is on the table.`} Running the numbers against your entry history before committing makes sense here.`;
    action = { type: "simulate_trade", label: `Simulated ${asset} exit`, payload: { asset, direction: "short" } };
  } else if (isRisk) {
    message = `Your current risk profile is ${memory.risk_profile}. Based on ${memory.interaction_count} interactions, your actual risk tolerance is ${memory.risk_profile === "unknown" ? "still calibrating" : "becoming clearer"}. The hesitation you're feeling is data — not weakness.`;
    action = { type: "update_risk", label: "Risk profile noted", payload: {} };
  } else if (isAnalysis && asset) {
    message = `Running behavioral analysis for ${asset}. With your ${memory.risk_profile} profile, I'd weight patience over urgency here. Your past decisions show a tendency toward ${topBehavior?.description || "varied behavior"} — keep that in check.`;
  } else {
    message = `Noted. I'm logging this interaction (${memory.interaction_count + 1} total) to refine your behavioral model. The more context you give me, the sharper my insights become. What specifically are you considering doing?`;
  }

  return {
    message,
    reasoning: `Interaction #${memory.interaction_count}. Risk profile: ${memory.risk_profile}. Top behavior: ${topBehavior?.tag || "none"}. Fallback mode active.`,
    action,
    behavioral_signals: signals,
  };
}

function extractAsset(input: string): string {
  const assets = ["btc", "eth", "sol", "bnb", "matic", "arb", "op", "avax", "link", "uni"];
  for (const a of assets) {
    if (input.includes(a)) return a.toUpperCase();
  }
  if (/bitcoin/i.test(input)) return "BTC";
  if (/ethereum/i.test(input)) return "ETH";
  if (/solana/i.test(input)) return "SOL";
  return "";
}

export async function runAgentReasoning(
  userInput: string,
  memory: AgentMemory
): Promise<Pick<AgentResponse, "message" | "reasoning" | "action" | "behavioral_signals">> {
  const prompt = buildPrompt(userInput, memory);
  const result = await callOpenAI(prompt, memory);

  return {
    message: result.message || "I'm processing your request.",
    reasoning: result.reasoning || "",
    action: result.action || { type: "none", label: "No action" },
    behavioral_signals: result.behavioral_signals || [],
  };
}