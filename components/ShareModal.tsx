'use client';

import { useState, useEffect } from "react";
import { AgentMemory } from "@/types";

interface ShareModalProps {
  userId: string;
  memory: AgentMemory | null;
  onClose: () => void;
}

export default function ShareModal({ userId, memory, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    setProfileUrl(`${window.location.origin}/profile/${userId}`);
  }, [userId]);

  // Publish profile to server when modal opens so the link works immediately
  useEffect(() => {
    if (!memory || memory.interaction_count === 0) return;

    setPublishing(true);
    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, memory }),
    })
      .then(r => r.json())
      .then(() => setPublished(true))
      .catch(() => {})
      .finally(() => setPublishing(false));
  }, [userId, memory]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenProfile = () => {
    window.open(profileUrl, "_blank");
  };

  const hasData = memory && memory.interaction_count > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700/60 rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Your Public Profile</h2>
            {publishing && <p className="text-xs text-zinc-500 mt-0.5">Publishing...</p>}
            {published && !publishing && (
              <p className="text-xs text-emerald-500 mt-0.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Profile published — link is live
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Profile preview */}
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-700/30 flex items-center justify-center">
              <span className="text-violet-400 text-xs font-bold">T</span>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-200">Trader #{userId.slice(0, 8)}</div>
              <div className="text-xs text-zinc-500">
                {hasData
                  ? `${memory.interaction_count} interactions · ${memory.risk_profile} profile`
                  : "No data yet — chat first to build your profile"}
              </div>
            </div>
            {hasData && memory.zg_root_hash && (
              <div className="ml-auto flex items-center gap-1 text-xs text-violet-400 bg-violet-950/40 border border-violet-900/40 rounded-full px-2 py-0.5">
                <div className="w-1 h-1 rounded-full bg-violet-400" />
                0G
              </div>
            )}
          </div>

          {hasData && memory.user_behavior.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {memory.user_behavior.slice(0, 3).map(b => (
                <span key={b.tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400">
                  {b.tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {!hasData && (
          <p className="text-xs text-zinc-500 text-center">
            Send a few messages first to build your behavioral profile.
          </p>
        )}

        {/* URL */}
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
          <span className="text-xs text-zinc-500 truncate flex-1 font-mono">{profileUrl}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={handleOpenProfile}
            disabled={publishing}
            className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white transition-colors"
          >
            {publishing ? "Publishing..." : "View Profile"}
            {!publishing && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-600 text-center">
          Shows behavior patterns only — no private messages or notes
        </p>
      </div>
    </div>
  );
}