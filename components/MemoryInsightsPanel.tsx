"use client";

import { AgentMemory } from "@/types";

interface MemoryInsightsPanelProps {
  memory: AgentMemory | null;
  isLoading: boolean;
}

const RISK_COLORS: Record<string, string> = {
  unknown: "text-zinc-400",
  conservative: "text-emerald-400",
  moderate: "text-amber-400",
  aggressive: "text-rose-400",
};

const RISK_BG: Record<string, string> = {
  unknown: "bg-zinc-800/60",
  conservative: "bg-emerald-950/40 border-emerald-900/40",
  moderate: "bg-amber-950/40 border-amber-900/40",
  aggressive: "bg-rose-950/40 border-rose-900/40",
};

const TAG_LABELS: Record<string, string> = {
  late_entry_anxiety: "Late Entry Anxiety",
  fomo_driven: "FOMO-Driven",
  risk_averse: "Risk Averse",
  panic_seller: "Panic Seller",
  high_conviction: "High Conviction",
  methodical_accumulator: "Methodical Accumulator",
  bearish_tendency: "Bearish Tendency",
  long_term_holder: "Long-Term Holder",
};

export default function MemoryInsightsPanel({
  memory,
  isLoading,
}: MemoryInsightsPanelProps) {
  if (!memory) {
    return (
      <div className="h-full flex flex-col gap-4 p-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-1">
          Memory Insights
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm text-center leading-relaxed">
            Send a message to begin
            <br />
            building your profile
          </p>
        </div>
      </div>
    );
  }

  const topBehaviors = [...memory.user_behavior]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const recentTrades = memory.trade_history.slice(0, 3);

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-y-auto">
      <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
        Memory Insights
      </div>

      <div
        className={`rounded-xl border p-3 ${RISK_BG[memory.risk_profile] || RISK_BG.unknown}`}
      >
        <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">
          Risk Profile
        </div>
        <div
          className={`text-lg font-semibold capitalize ${RISK_COLORS[memory.risk_profile]}`}
        >
          {memory.risk_profile === "unknown"
            ? "Calibrating..."
            : memory.risk_profile}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Interactions
          </div>
          <div className="text-xl font-semibold text-violet-300">
            {memory.interaction_count}
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Sim Trades
          </div>
          <div className="text-xl font-semibold text-violet-300">
            {memory.trade_history.length}
          </div>
        </div>
      </div>

      {topBehaviors.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Detected Patterns
          </div>
          <div className="flex flex-col gap-1.5">
            {topBehaviors.map((b) => (
              <div
                key={b.tag}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-200 font-medium">
                    {TAG_LABELS[b.tag] || b.tag}
                  </span>
                  <span className="text-xs text-violet-400 font-semibold bg-violet-950/50 px-1.5 py-0.5 rounded-md">
                    ×{b.count}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  {b.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentTrades.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Recent Simulations
          </div>
          <div className="flex flex-col gap-1.5">
            {recentTrades.map((t) => (
              <div
                key={t.id}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200">
                    {t.asset}
                  </span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      t.direction === "long"
                        ? "bg-emerald-950/60 text-emerald-400"
                        : t.direction === "short"
                          ? "bg-rose-950/60 text-rose-400"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-600 ml-auto">
                    {new Date(t.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                  {t.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {memory.notes.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Agent Notes
          </div>
          <div className="flex flex-col gap-1">
            {memory.notes.slice(0, 3).map((note, i) => (
              <div
                key={i}
                className="text-xs text-zinc-500 leading-relaxed pl-2 border-l border-violet-900/50"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-xs text-violet-400/60 text-center animate-pulse mt-auto">
          Updating memory...
        </div>
      )}
    </div>
  );
}
