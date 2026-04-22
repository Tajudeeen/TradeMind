/**
 * Mock 0G Storage Layer
 *
 * In production, this would interface with 0G Storage's decentralized
 * key-value store and append-only log system. For the MVP, we use an
 * in-memory store with file-system persistence to simulate the same
 * read/write patterns.
 */

import { AgentMemory } from "@/types";
import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".trademind-storage");
const MEMORY_FILE = (userId: string) =>
  path.join(STORAGE_DIR, `${userId}.json`);

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

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

// Simulates 0G Storage: read a user's persistent memory blob
export async function readMemory(userId: string): Promise<AgentMemory> {
  ensureStorageDir();
  const file = MEMORY_FILE(userId);
  if (!fs.existsSync(file)) {
    return defaultMemory(userId);
  }
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as AgentMemory;
  } catch {
    return defaultMemory(userId);
  }
}

// Simulates 0G Storage: write/update a user's persistent memory blob
export async function writeMemory(memory: AgentMemory): Promise<void> {
  ensureStorageDir();
  const file = MEMORY_FILE(memory.userId);
  memory.last_updated = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(memory, null, 2), "utf-8");
}

// Append a note to user memory log (simulates 0G append-only log)
export async function appendNote(userId: string, note: string): Promise<void> {
  const memory = await readMemory(userId);
  memory.notes = [note, ...memory.notes].slice(0, 20); // keep last 20
  await writeMemory(memory);
}

// Reset memory (for demo purposes)
export async function resetMemory(userId: string): Promise<AgentMemory> {
  const fresh = defaultMemory(userId);
  await writeMemory(fresh);
  return fresh;
}