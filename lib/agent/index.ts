import { AgentMemory } from "@/types";

// In-memory store — always works, survives any fs failure
const memoryStore = new Map<string, AgentMemory>();

export function defaultMemory(userId: string): AgentMemory {
  return {
    userId,
    risk_profile: "unknown",
    user_behavior: [],
    trade_history: [],
    notes: [],
    interaction_count: 0,
    last_updated: new Date().toISOString(),
  };
}

function getFS() {
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), ".trademind-storage");
    return { fs, path, dir };
  } catch {
    return null;
  }
}

function readFile(userId: string): AgentMemory | null {
  try {
    const mod = getFS();
    if (!mod) return null;
    const { fs, path, dir } = mod;
    const file = path.join(dir, `${userId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as AgentMemory;
  } catch {
    return null;
  }
}

function writeFile(memory: AgentMemory): void {
  try {
    const mod = getFS();
    if (!mod) return;
    const { fs, path, dir } = mod;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${memory.userId}.json`);
    fs.writeFileSync(file, JSON.stringify(memory, null, 2), "utf-8");
  } catch {
    // silent — in-memory is the source of truth
  }
}

export async function readMemory(userId: string): Promise<AgentMemory> {
  // Cache hit
  if (memoryStore.has(userId)) return memoryStore.get(userId)!;
  // Try disk
  const fromDisk = readFile(userId);
  if (fromDisk) {
    memoryStore.set(userId, fromDisk);
    return fromDisk;
  }
  // Fresh
  const fresh = defaultMemory(userId);
  memoryStore.set(userId, fresh);
  return fresh;
}

export async function writeMemory(memory: AgentMemory): Promise<void> {
  memory.last_updated = new Date().toISOString();
  memoryStore.set(memory.userId, { ...memory });
  writeFile(memory);
}

export async function resetMemory(userId: string): Promise<AgentMemory> {
  const fresh = defaultMemory(userId);
  memoryStore.set(userId, fresh);
  writeFile(fresh);
  return fresh;
}