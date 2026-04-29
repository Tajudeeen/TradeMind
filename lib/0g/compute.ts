/**
 * 0G Compute Network — Decentralized AI Inference
 *
 * Uses @0glabs/0g-serving-broker to route inference requests through
 * a 0G Compute provider instead of OpenAI.
 *
 * Setup:
 * 1. Install CLI: npm i -g @0glabs/0g-serving-broker
 * 2. 0g-compute-cli setup-network
 * 3. 0g-compute-cli inference get-secret --provider <PROVIDER_ADDRESS>
 * 4. Set ZG_COMPUTE_SECRET and ZG_COMPUTE_URL in .env.local
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ComputeResult {
  message: string;
  reasoning: string;
  action: unknown;
  behavioral_signals: string[];
  provider?: string;
}

export async function runInferenceOn0G(
  systemPrompt: string,
  userPrompt: string,
): Promise<ComputeResult | null> {
  const secret = process.env.ZG_COMPUTE_SECRET;
  const computeURL = process.env.ZG_COMPUTE_URL;

  if (!secret || !computeURL) return null;

  try {
    // 0G Compute exposes an OpenAI-compatible endpoint
    // after obtaining a secret via the CLI
    const res = await fetch(`${computeURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        model: process.env.ZG_COMPUTE_MODEL || "qwen-2.5-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("[0G Compute] HTTP error:", res.status);
      return null;
    }

    const data = (await res.json()) as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    if (parsed.action && !parsed.action.payload) parsed.action.payload = {};

    return {
      ...parsed,
      provider: computeURL,
    };
  } catch (err) {
    console.error(
      "[0G Compute Error]",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
