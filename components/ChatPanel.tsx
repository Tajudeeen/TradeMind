'use client';

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
}

const SUGGESTED_PROMPTS = [
  "Should I buy ETH?",
  "Too late to enter BTC?",
  "Should I DCA or go all in?",
  "I'm thinking of shorting",
  "Analyze my risk profile",
];

export default function ChatPanel({
  messages,
  isLoading,
  onSend,
  inputValue,
  onInputChange,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageCountRef = useRef(0);

  useEffect(() => {
    const hasNew = messages.length > messageCountRef.current || isLoading;
    if (hasNew && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    messageCountRef.current = messages.length;
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) onSend(inputValue.trim());
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 min-h-0 overscroll-contain">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-2">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-semibold text-zinc-200 mb-1.5 tracking-tight">
                What&apos;s your next move?
              </div>
              <div className="text-xs sm:text-sm text-zinc-500">
                I remember your patterns. The more we talk, the sharper I get.
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => onSend(p)}
                  className="text-left text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 active:bg-violet-950/30 hover:text-zinc-200 hover:border-violet-800/50 hover:bg-violet-950/20 transition-all duration-150"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-zinc-800/60 p-3 sm:p-4">
        <div className="flex items-end gap-2 sm:gap-3 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-violet-700/50 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(e) => {
              onInputChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a trade or asset..."
            className="flex-1 bg-transparent text-zinc-200 placeholder-zinc-600 text-sm resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: "100px" }}
          />
          <button
            onClick={() => inputValue.trim() && onSend(inputValue.trim())}
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? "" : "flex gap-2 sm:gap-3"}`}>
        {!isUser && (
          <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-violet-600/20 border border-violet-700/30 flex items-center justify-center mt-0.5">
            <span className="text-violet-400 text-xs font-bold">T</span>
          </div>
        )}
        <div className="min-w-0">
          <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed break-words ${
            isUser
              ? "bg-violet-600/20 border border-violet-700/30 text-zinc-200 rounded-br-sm"
              : "bg-zinc-900/80 border border-zinc-800/60 text-zinc-200 rounded-bl-sm"
          }`}>
            {message.content}
          </div>

          {!isUser && message.action && message.action.type !== "none" && (
            <div className="mt-1.5 ml-0.5">
              <ActionBadge action={message.action} />
            </div>
          )}

          <div className={`text-xs text-zinc-700 mt-1 ${isUser ? "text-right" : "ml-0.5"}`}>
            {new Date(message.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: ChatMessage["action"] }) {
  if (!action) return null;

  const styles: Record<string, string> = {
    simulate_trade: "bg-emerald-950/50 border-emerald-900/40 text-emerald-400",
    update_risk: "bg-amber-950/50 border-amber-900/40 text-amber-400",
    flag_behavior: "bg-violet-950/50 border-violet-900/40 text-violet-400",
    none: "hidden",
  };

  const icons: Record<string, string> = {
    simulate_trade: "⟳",
    update_risk: "◈",
    flag_behavior: "◉",
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${styles[action.type]}`}>
      <span>{icons[action.type]}</span>
      {action.label}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3">
      <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-violet-600/20 border border-violet-700/30 flex items-center justify-center">
        <span className="text-violet-400 text-xs font-bold">T</span>
      </div>
      <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-500/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}