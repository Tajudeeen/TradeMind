'use client';
import { PublicProfile } from "@/app/api/profile/route";
import { useState } from "react";

interface ProfileViewProps {
  profile: PublicProfile | null;
  userId: string;
}

const RISK_COLORS: Record<string, { text: string; bg: string; border: string; label: string }> = {
  aggressive:   { text: "text-rose-400",    bg: "bg-rose-950/40",    border: "border-rose-900/50",    label: "Aggressive" },
  conservative: { text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-900/50", label: "Conservative" },
  moderate:     { text: "text-amber-400",   bg: "bg-amber-950/40",   border: "border-amber-900/50",   label: "Moderate" },
  unknown:      { text: "text-zinc-400",    bg: "bg-zinc-800/40",    border: "border-zinc-700/50",    label: "Calibrating" },
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

const TAG_ICONS: Record<string, string> = {
  late_entry_anxiety:    "⏱",
  fomo_driven:           "🔥",
  risk_averse:           "🛡",
  panic_seller:          "📉",
  high_conviction:       "⚡",
  methodical_accumulator:"📊",
  bearish_tendency:      "🐻",
  long_term_holder:      "💎",
};

export default function ProfileView({ profile, userId }: ProfileViewProps) {
  const [copied, setCopied] = useState(false);

  const shortId = userId.slice(0, 8);
  const profileUrl = typeof window !== "undefined"
    ? window.location.href
    : `https://trademind.app/profile/${userId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile || profile.interaction_count === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-700/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-violet-400 text-lg font-bold">T</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-200 mb-2">Profile not found</h1>
          <p className="text-sm text-zinc-500 mb-6">
            This profile doesn&apos;t exist yet or hasn&apos;t been stored on 0G Storage.
          </p>
          <a
            href="/"
            className="text-sm px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-700/40 text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            Start your own profile
          </a>
        </div>
      </div>
    );
  }

  const risk = RISK_COLORS[profile.risk_profile] || RISK_COLORS.unknown;
  const topBehaviors = profile.user_behavior.slice(0, 6);
  const totalSignals = profile.user_behavior.reduce((s, b) => s + b.count, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-100">TradeMind</span>
          </div>
          <a
            href="/"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Launch app →
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Profile identity */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-semibold text-zinc-100">
                Trader #{shortId}
              </h1>
              {profile.verified && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-950/50 border border-violet-900/40 text-violet-400">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified on 0G
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {profile.interaction_count} interactions · {totalSignals} behavioral signals · last active{" "}
              {new Date(profile.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Share button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors flex-shrink-0"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </>
            )}
          </button>
        </div>

        {/* Risk profile card */}
        <div className={`rounded-2xl border p-5 ${risk.bg} ${risk.border}`}>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Risk Profile</div>
          <div className={`text-3xl font-bold ${risk.text} mb-1`}>{risk.label}</div>
          <div className="text-xs text-zinc-500">
            Based on {totalSignals} signals across {profile.user_behavior.length} behavior categories
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-300 mb-1">{profile.interaction_count}</div>
            <div className="text-xs text-zinc-500">Sessions</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-300 mb-1">{profile.trade_stats.total}</div>
            <div className="text-xs text-zinc-500">Sim Trades</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-300 mb-1">
              {profile.trade_stats.assets.length > 0
                ? profile.trade_stats.assets.slice(0, 2).join(", ")
                : "—"}
            </div>
            <div className="text-xs text-zinc-500">Top Assets</div>
          </div>
        </div>

        {/* Trade direction breakdown */}
        {profile.trade_stats.total > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Simulated Trade Breakdown</div>
            <div className="flex gap-3">
              {[
                { label: "Long", count: profile.trade_stats.directions.long,  color: "bg-emerald-500" },
                { label: "Short", count: profile.trade_stats.directions.short, color: "bg-rose-500" },
                { label: "Hold",  count: profile.trade_stats.directions.hold,  color: "bg-zinc-500" },
              ].map(({ label, count, color }) => {
                const pct = profile.trade_stats.total > 0
                  ? Math.round((count / profile.trade_stats.total) * 100)
                  : 0;
                return (
                  <div key={label} className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <span className="text-xs text-zinc-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">{count} trades</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Behavioral patterns */}
        {topBehaviors.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Behavioral DNA</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topBehaviors.map((b, i) => (
                <div
                  key={b.tag}
                  className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-start gap-3"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{TAG_ICONS[b.tag] || "◈"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {TAG_LABELS[b.tag] || b.tag}
                      </span>
                      {i === 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-900/40 text-violet-400 flex-shrink-0">
                          dominant
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{b.description}</div>
                    <div className="text-xs text-zinc-700 mt-1">
                      {b.count}× detected · last {new Date(b.last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 0G Verification block */}
        <div className={`rounded-2xl border p-4 ${
          profile.verified
            ? "bg-violet-950/20 border-violet-900/40"
            : "bg-zinc-900/40 border-zinc-800/40"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black leading-none" style={{ fontSize: "8px" }}>0G</span>
            </div>
            <span className="text-sm font-medium text-zinc-200">
              {profile.verified ? "Verified on 0G Storage" : "Not yet stored on 0G"}
            </span>
            {profile.verified && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
            )}
          </div>

          {profile.verified ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 leading-relaxed">
                This behavioral profile is permanently stored on the 0G decentralized storage network.
                The data is tamper-proof — anyone can verify it using the root hash below.
              </p>
              {profile.zg_tx_hash && (
                <div className="flex items-center justify-between bg-zinc-950/60 rounded-lg px-3 py-2">
                  <span className="text-xs text-zinc-600">Transaction</span>
                  <a
                    href={`https://chainscan-galileo.0g.ai/tx/${profile.zg_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                  >
                    {profile.zg_tx_hash.slice(0, 12)}...{profile.zg_tx_hash.slice(-8)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}
              {profile.zg_root_hash && (
                <div className="flex items-center justify-between bg-zinc-950/60 rounded-lg px-3 py-2">
                  <span className="text-xs text-zinc-600">Root Hash</span>
                  <span className="font-mono text-xs text-zinc-500">
                    {profile.zg_root_hash.slice(0, 12)}...{profile.zg_root_hash.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Set ZG_PRIVATE_KEY to enable onchain storage and verification.
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-zinc-600 mb-3">
            Build your own onchain behavioral profile
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Start with TradeMind
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  );
}