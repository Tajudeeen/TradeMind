import { AgentMemory, AgentResponse } from "@/types";
import { defaultMemory, writeMemory } from "@/lib/storage";
import { extractBehaviorSignals, updateBehaviorTags, logTradeSimulation } from "./behavior";
import { runAgentReasoning } from "./reasoning";

export async function processAgentMessage(
  userId: string,
  userInput: string,
  seedMemory?: AgentMemory
): Promise<AgentResponse> {
  let memory: AgentMemory = seedMemory ? { ...seedMemory } : defaultMemory(userId);

  if (userId !== "debug-user") {
    memory.interaction_count = (memory.interaction_count || 0) + 1;
  }

  const signals = extractBehaviorSignals(userInput);
  memory = updateBehaviorTags(memory, signals);

  const { message, reasoning, action, behavioral_signals } =
    await runAgentReasoning(userInput, memory);

  if (action.type === "simulate_trade" && action.payload) {
    const asset     = (action.payload.asset as string)     || "ETH";
    const direction = (action.payload.direction as "long" | "short" | "hold") || "long";
    memory = logTradeSimulation(memory, {
      asset,
      direction,
      reasoning: message.slice(0, 150),
      user_input: userInput,
      simulated: true,
      outcome: "pending",
    });
  }

  const allSignalTags = [...new Set([...signals.map((s) => s.tag), ...behavioral_signals])];

  if (allSignalTags.length > 0) {
    const note = `[${new Date().toLocaleDateString()}] ${allSignalTags.join(", ")}: "${userInput.slice(0, 60)}"`;
    memory.notes = [note, ...memory.notes].slice(0, 20);
  }

  memory.last_updated = new Date().toISOString();

  // Persist to 0G Storage — get proof back
  const storageResult = await writeMemory(memory);

  const zgProof = storageResult.stored_on_0g && storageResult.txHash
    ? {
        tx_hash: storageResult.txHash,
        root_hash: storageResult.rootHash || "",
        tx_url: `https://chainscan-galileo.0g.ai/tx/${storageResult.txHash}`,
        stored_on_0g: true,
      }
    : undefined;

  return {
    message,
    reasoning,
    action,
    updated_memory: memory,
    behavioral_signals: allSignalTags,
    zg_proof: zgProof,
  };
}