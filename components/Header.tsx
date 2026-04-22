'use client';

interface HeaderProps {
  walletAddress: string | null;
  onConnect: () => void;
  onReset: () => void;
  userId: string;
}

export default function Header({ walletAddress, onConnect, onReset, userId }: HeaderProps) {
  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">TradeMind</span>
          {userId && (
            <span className="text-xs text-zinc-600">#{userId.slice(0, 8)}</span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-full px-2.5 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="text-xs text-zinc-600 hover:text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
        >
          Reset Memory
        </button>
        <button
          onClick={onConnect}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            walletAddress
              ? "bg-zinc-900 border-zinc-700 text-zinc-300"
              : "bg-violet-600/10 border-violet-700/50 text-violet-300 hover:bg-violet-600/20"
          }`}
        >
          {shortAddr ? (
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              {shortAddr}
            </span>
          ) : (
            "Connect Wallet"
          )}
        </button>
      </div>
    </header>
  );
}