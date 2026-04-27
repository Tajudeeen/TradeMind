'use client';

import { useState } from "react";
import { AgentMemory } from "@/types";

interface MemoryInsightsPanelProps {
  memory: AgentMemory | null;
  isLoading: boolean;
  isInitializing?: boolean;
  onAuditRequest?: () => void;
  userId?: string;
}

const RISK_COLORS: Record<string, string> = {
  unknown:      "text-zinc-400",
  conservative: "text-emerald-400",
  moderate:     "text-amber-400",
  aggressive:   "text-rose-400",
};

const RISK_BG: Record<string, string> = {
  unknown:      "bg-zinc-800/60 border-zinc-700/40",
  conservative: "bg-emerald-950/40 border-emerald-900/40",
  moderate:     "bg-amber-950/40 border-amber-900/40",
  aggressive:   "bg-rose-950/40 border-rose-900/40",
};

const TAG_LABELS: Record<string, string> = {
  late_entry_anxiety:    "Late Entry Anxiety",
  fomo_driven:           "FOMO-Driven",
  risk_averse:           "Risk Averse",
  panic_seller:          "Panic Seller",
  high_conviction:       "High Conviction",
  methodical_accumulator:"Methodical Accumulator",
  bearish_tendency:      "Bearish Tendency",
  long_term_holder:      "Long-Term Holder",
};

export default function MemoryInsightsPanel({
  memory,
  isLoading,
  isInitializing,
  onAuditRequest,
  userId,
}: MemoryInsightsPanelProps) {
  const [showExport, setShowExport] = useState(false);

  if (isInitializing) {
    return (
      <div className="h-full flex flex-col gap-3 p-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Memory Insights</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-violet-600/40 border-t-violet-400 animate-spin" />
            <span className="text-xs text-zinc-600">Loading memory...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!memory || memory.interaction_count === 0) {
    return (
      <div className="h-full flex flex-col gap-4 p-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Memory Insights</div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm text-center leading-relaxed">
            Send a message to begin<br />building your profile
          </p>
        </div>
      </div>
    );
  }

  const topBehaviors = [...memory.user_behavior].sort((a, b) => b.count - a.count).slice(0, 5);
  const recentTrades = memory.trade_history.slice(0, 3);
  const totalSignals = memory.user_behavior.reduce((s, b) => s + b.count, 0);

  function handleExport() {
    const data = JSON.stringify(memory, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `trademind-memory-${memory!.userId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  }

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Memory Insights</div>
        <button
          onClick={() => setShowExport(!showExport)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Export
        </button>
      </div>

      {showExport && (
        <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Download your full memory as JSON — everything the agent knows about you.
          </p>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-700/40 text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            Download memory.json
          </button>
        </div>
      )}

      {/* Risk Profile */}
      <div className={`rounded-xl border p-3 ${RISK_BG[memory.risk_profile] || RISK_BG.unknown}`}>
        <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Risk Profile</div>
        <div className={`text-lg font-semibold capitalize ${RISK_COLORS[memory.risk_profile]}`}>
          {memory.risk_profile === "unknown" ? "Calibrating..." : memory.risk_profile}
        </div>
        {memory.risk_profile !== "unknown" && (
          <div className="text-xs text-zinc-600 mt-0.5">
            {totalSignals} signals detected
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Interactions</div>
          <div className="text-xl font-semibold text-violet-300">{memory.interaction_count}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sim Trades</div>
          <div className="text-xl font-semibold text-violet-300">{memory.trade_history.length}</div>
        </div>
      </div>

      {/* Memory Audit button */}
      {onAuditRequest && memory.interaction_count >= 3 && (
        <button
          onClick={onAuditRequest}
          className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-violet-950/40 border border-violet-900/40 text-violet-300 hover:bg-violet-950/60 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Audit My Memory
        </button>
      )}

      {/* Behavior Patterns */}
      {topBehaviors.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Detected Patterns</div>
          <div className="flex flex-col gap-1.5">
            {topBehaviors.map((b) => (
              <div key={b.tag} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-200 font-medium">{TAG_LABELS[b.tag] || b.tag}</span>
                  <span className="text-xs text-violet-400 font-semibold bg-violet-950/50 px-1.5 py-0.5 rounded-md">×{b.count}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{b.description}</div>
                <div className="text-xs text-zinc-700 mt-0.5">
                  Last {new Date(b.last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Simulations */}
      {recentTrades.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recent Simulations</div>
          <div className="flex flex-col gap-1.5">
            {recentTrades.map((t) => (
              <div key={t.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200">{t.asset}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    t.direction === "long"  ? "bg-emerald-950/60 text-emerald-400" :
                    t.direction === "short" ? "bg-rose-950/60 text-rose-400" :
                    "bg-zinc-800 text-zinc-400"
                  }`}>
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-600 ml-auto">
                    {new Date(t.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{t.reasoning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Notes */}
      {memory.notes.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Agent Notes</div>
          <div className="flex flex-col gap-1">
            {memory.notes.slice(0, 5).map((note, i) => (
              <div key={i} className="text-xs text-zinc-500 leading-relaxed pl-2 border-l border-violet-900/50">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 0G verification badge */}
      {memory.zg_root_hash && (
        <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-4 h-4 rounded bg-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black leading-none" style={{ fontSize: "7px" }}>0G</span>
            </div>
            <span className="text-xs text-violet-300 font-medium">Stored on 0G</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
          </div>
          {memory.zg_tx_hash && (
            <a
              href={`https://chainscan-galileo.0g.ai/tx/${memory.zg_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-zinc-600 hover:text-violet-400 flex items-center gap-1 transition-colors"
            >
              {memory.zg_tx_hash.slice(0, 16)}...
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* View public profile link */}
      {userId && memory.interaction_count >= 3 && (
        <a
          href={`/profile/${userId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
        >
          View public profile
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}

      {isLoading && (
        <div className="text-xs text-violet-400/60 text-center animate-pulse mt-auto pt-2">
          Updating memory...
        </div>
      )}

      {memory.last_updated && (
        <div className="text-xs text-zinc-700 text-center mt-auto pt-2">
          Updated {new Date(memory.last_updated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}