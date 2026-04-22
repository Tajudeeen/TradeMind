/**
 * Agent Orchestrator
 *
 * Flow: input → fetch memory → reason → extract signals → update memory → return
 */

import { AgentMemory, AgentResponse } from "@/types";
import { readMemory, writeMemory } from "@/lib/storage";
import {
  extractBehaviorSignals,
  updateBehaviorTags,
  logTradeSimulation,
} from "./behavior";
import { runAgentReasoning } from "./reasoning";

export async function processAgentMessage(
  userId: string,
  userInput: string
): Promise<AgentResponse> {
  // 1. Fetch persistent memory
  let memory = await readMemory(userId);
  memory.interaction_count++;

  // 2. Extract behavior signals from raw input
  const signals = extractBehaviorSignals(userInput);

  // 3. Update behavior tags in memory
  memory = updateBehaviorTags(memory, signals);

  // 4. Run AI reasoning with full memory context
  const { message, reasoning, action, behavioral_signals } =
    await runAgentReasoning(userInput, memory);

  // 5. Handle action side effects
  if (action.type === "simulate_trade" && action.payload) {
    const asset = (action.payload.asset as string) || "ETH";
    const direction = (action.payload.direction as "long" | "short" | "hold") || "long";
    memory = logTradeSimulation(memory, {
      asset,
      direction,
      reasoning: `${message.slice(0, 120)}...`,
      user_input: userInput,
      simulated: true,
      outcome: "pending",
    });
  }

  // 6. Merge AI-detected signals with rule-based ones
  const allSignalTags = [
    ...signals.map((s) => s.tag),
    ...behavioral_signals,
  ];

  // 7. Add agent note if high-signal interaction
  if (allSignalTags.length > 0) {
    const note = `[${new Date().toLocaleDateString()}] ${allSignalTags.join(", ")} detected: "${userInput.slice(0, 60)}"`;
    memory.notes = [note, ...memory.notes].slice(0, 20);
  }

  // 8. Persist updated memory
  await writeMemory(memory);

  return {
    message,
    reasoning,
    action,
    updated_memory: memory,
    behavioral_signals: allSignalTags,
  };
}