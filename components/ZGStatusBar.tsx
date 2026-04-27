'use client';

interface ZGStatusBarProps {
  isLive: boolean;
  txHash?: string;
  rootHash?: string;
  snapshotCount: number;
}

export default function ZGStatusBar({ isLive, txHash, rootHash, snapshotCount }: ZGStatusBarProps) {
  return (
    <div className={`hidden lg:flex flex-shrink-0 items-center gap-3 border-t px-4 py-1.5 ${
      isLive
        ? "border-violet-900/30 bg-violet-950/10"
        : "border-zinc-800/40 bg-zinc-950"
    }`}>
      {/* 0G badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className={`w-4 h-4 rounded flex items-center justify-center ${isLive ? "bg-violet-600" : "bg-zinc-800"}`}>
          <span className={`font-black leading-none ${isLive ? "text-white" : "text-zinc-600"}`} style={{ fontSize: "7px" }}>0G</span>
        </div>
        {isLive
          ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs text-violet-400 font-medium">Live</span></>
          : <span className="text-xs text-zinc-700">Set ZG_PRIVATE_KEY to enable onchain memory</span>
        }
      </div>

      {isLive && txHash && (
        <>
          <div className="w-px h-3 bg-zinc-800" />
          <a
            href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="text-zinc-600">tx:</span>
            <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-6)}</span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </>
      )}

      {isLive && rootHash && (
        <>
          <div className="w-px h-3 bg-zinc-800 hidden sm:block" />
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600">
            root: <span className="font-mono">{rootHash.slice(0, 10)}...{rootHash.slice(-6)}</span>
          </span>
        </>
      )}

      {isLive && snapshotCount > 0 && (
        <>
          <div className="w-px h-3 bg-zinc-800" />
          <span className="text-xs text-zinc-600">{snapshotCount} snapshot{snapshotCount !== 1 ? "s" : ""}</span>
        </>
      )}

      {isLive && (
        <a
          href="https://docs.0g.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          0G Galileo Testnet ↗
        </a>
      )}
    </div>
  );
}