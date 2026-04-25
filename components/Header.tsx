'use client';

interface HeaderProps {
  walletAddress: string | null;
  onConnect: () => void;
  onReset: () => void;
  onMemoryToggle: () => void;
  userId: string;
  activeTab: "chat" | "memory";
}

export default function Header({
  walletAddress,
  onConnect,
  onReset,
  onMemoryToggle,
  userId,
  activeTab,
}: HeaderProps) {
  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-4 flex-shrink-0 gap-2">
      {/* Left: logo + name */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">TradeMind</span>
          {userId && (
            <span className="text-xs text-zinc-600 hidden sm:inline">#{userId.slice(0, 8)}</span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Memory toggle — mobile only, in header */}
        <button
          onClick={onMemoryToggle}
          className={`lg:hidden text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            activeTab === "memory"
              ? "bg-violet-600/20 border-violet-700/50 text-violet-300"
              : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Memory
        </button>

        {/* Reset — trash icon on mobile, text on desktop */}
        <button
          onClick={onReset}
          title="Reset memory"
          className="text-xs text-zinc-600 hover:text-zinc-400 p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
        >
          <svg className="sm:hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Wallet */}
        <button
          onClick={onConnect}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
            walletAddress
              ? "bg-zinc-900 border-zinc-700 text-zinc-300"
              : "bg-violet-600/10 border-violet-700/50 text-violet-300 hover:bg-violet-600/20"
          }`}
        >
          {shortAddr ? (
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="hidden sm:inline">{shortAddr}</span>
              <span className="sm:hidden">{shortAddr.slice(0, 8)}</span>
            </span>
          ) : (
            <span>
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </span>
          )}
        </button>
      </div>
    </header>
  );
}