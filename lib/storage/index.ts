/**
 * 0G Storage Layer
 *
 * Uses StreamDataBuilder + Batcher for KV writes (fast, mutable, keyed)
 * and Indexer + MemData for immutable snapshots (verifiable root hash).
 *
 * All 0G SDK calls are wrapped in `any` casts at the boundary because
 * the SDK ships CommonJS ethers while Next.js resolves ESM ethers — the
 * types differ structurally even though they behave identically at runtime.
 *
 * Falls back to in-memory Map when ZG_PRIVATE_KEY is not set.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AgentMemory } from "@/types";

const ZG_EVM_RPC = process.env.ZG_EVM_RPC || "https://evmrpc-testnet.0g.ai";
const ZG_INDEXER_RPC =
  process.env.ZG_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai";
const ZG_KV_RPC = process.env.ZG_KV_RPC || "https://rpc-storage-testnet.0g.ai";
const ZG_KV_FLOW =
  process.env.ZG_KV_FLOW || "0xbD2C3F0E2984E1CF2b5163246AEA67B58334dB25";
const ZG_STREAM_ID =
  process.env.ZG_STREAM_ID ||
  "0x0000000000000000000000000000000000000000000000747261646500000001";

const memStore = new Map<string, AgentMemory>();

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

function is0GEnabled(): boolean {
  return !!process.env.ZG_PRIVATE_KEY;
}

export interface StorageResult {
  success: boolean;
  txHash?: string;
  rootHash?: string;
  stored_on_0g: boolean;
  error?: string;
}

// Build a signer using the SDK's bundled ethers to avoid ESM/CJS mismatch
async function buildSigner() {
  // Use require so we get the CommonJS ethers that the SDK expects
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ethers } = require("ethers");
  const provider = new ethers.JsonRpcProvider(ZG_EVM_RPC);
  const signer = new ethers.Wallet(process.env.ZG_PRIVATE_KEY!, provider);
  return signer;
}

// ─── KV WRITE ────────────────────────────────────────────────────────────────
export async function writeMemoryTo0G(
  memory: AgentMemory,
): Promise<StorageResult> {
  if (!is0GEnabled())
    return {
      success: false,
      stored_on_0g: false,
      error: "ZG_PRIVATE_KEY not set",
    };

  try {
    const sdk = await import("@0glabs/0g-ts-sdk");
    const signer = await buildSigner();
    const flow = sdk.getFlowContract(ZG_KV_FLOW, signer as any);

    const clients = [new (sdk.StorageNode as any)(ZG_KV_RPC)];
    const batcher = new (sdk.Batcher as any)(1, clients, flow, ZG_EVM_RPC);

    const key =
      "0x" + Buffer.from(`trademind:memory:${memory.userId}`).toString("hex");
    const value = "0x" + Buffer.from(JSON.stringify(memory)).toString("hex");

    batcher.streamDataBuilder.set(ZG_STREAM_ID, key, value);

    const [txHash, err] = await batcher.exec(signer);
    if (err) throw new Error(String(err));

    console.log(`[0G KV] Written — tx: ${txHash}`);
    return { success: true, txHash, stored_on_0g: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[0G KV Write Error]", msg);
    return { success: false, stored_on_0g: false, error: msg };
  }
}

// ─── KV READ ─────────────────────────────────────────────────────────────────
export async function readMemoryFrom0G(
  userId: string,
): Promise<AgentMemory | null> {
  if (!is0GEnabled()) return null;

  try {
    const { KvClient } = await import("@0glabs/0g-ts-sdk");
    const kv = new KvClient(ZG_KV_RPC);
    const key =
      "0x" + Buffer.from(`trademind:memory:${userId}`).toString("hex");

    // getValue returns { data: string, size: number, version: number } or null
    const value = await (kv as any).getValue(ZG_STREAM_ID, key as any);
    if (!value?.data) return null;

    const raw = Buffer.from(
      String(value.data).replace(/^0x/, ""),
      "hex",
    ).toString("utf-8");
    return JSON.parse(raw) as AgentMemory;
  } catch (err) {
    console.error(
      "[0G KV Read Error]",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ─── SNAPSHOT (every 10 interactions) ────────────────────────────────────────
export async function snapshotMemoryTo0G(
  memory: AgentMemory,
): Promise<StorageResult> {
  if (!is0GEnabled())
    return {
      success: false,
      stored_on_0g: false,
      error: "ZG_PRIVATE_KEY not set",
    };

  try {
    const sdk = await import("@0glabs/0g-ts-sdk");
    const signer = await buildSigner();
    const indexer = new sdk.Indexer(ZG_INDEXER_RPC);

    const payload = JSON.stringify({
      type: "trademind_memory_snapshot",
      version: 1,
      timestamp: new Date().toISOString(),
      memory,
    });

    const memData = new sdk.MemData(Buffer.from(payload));

    const [tree, treeErr] = await memData.merkleTree();
    const rootHash =
      !treeErr && tree ? (tree as any).rootHash().toString("hex") : undefined;

    const [txHash, uploadErr] = await indexer.upload(
      memData as any,
      ZG_EVM_RPC,
      signer as any,
    );
    if (uploadErr) throw new Error(String(uploadErr));

    console.log(`[0G Snapshot] tx: ${String(txHash)} | root: ${rootHash}`);
    return {
      success: true,
      txHash: String(txHash),
      rootHash,
      stored_on_0g: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[0G Snapshot Error]", msg);
    return { success: false, stored_on_0g: false, error: msg };
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
export async function readMemory(userId: string): Promise<AgentMemory> {
  if (memStore.has(userId)) return memStore.get(userId)!;

  if (is0GEnabled()) {
    const from0G = await readMemoryFrom0G(userId);
    if (from0G) {
      memStore.set(userId, from0G);
      return from0G;
    }
  }

  return defaultMemory(userId);
}

export async function writeMemory(memory: AgentMemory): Promise<StorageResult> {
  memory.last_updated = new Date().toISOString();
  memStore.set(memory.userId, { ...memory });

  const result = await writeMemoryTo0G(memory);

  // Snapshot every 10 interactions — fire and forget
  if (
    is0GEnabled() &&
    memory.interaction_count % 10 === 0 &&
    memory.interaction_count > 0
  ) {
    snapshotMemoryTo0G(memory).then((r) => {
      if (r.success)
        console.log(
          `[0G] Snapshot #${memory.interaction_count / 10}: root=${r.rootHash}`,
        );
    });
  }

  return result;
}

export async function resetMemory(userId: string): Promise<AgentMemory> {
  const fresh = defaultMemory(userId);
  memStore.set(userId, fresh);
  return fresh;
}
