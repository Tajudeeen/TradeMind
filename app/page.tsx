'use client';

import { useState, useCallback, useEffect } from "react";
import { ChatMessage, AgentMemory, AgentResponse } from "@/types";
import ChatPanel from "@/components/ChatPanel";
import MemoryInsightsPanel from "@/components/MemoryInsightsPanel";
import Header from "@/components/Header";

function getOrCreateUserId(): string {
  let id = localStorage.getItem("trademind_user_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("trademind_user_id", id);
  }
  return id;
}

function saveMemoryLocally(memory: AgentMemory) {
  try {
    localStorage.setItem(`trademind_memory_${memory.userId}`, JSON.stringify(memory));
  } catch {}
}

function loadMemoryLocally(userId: string): AgentMemory | null {
  try {
    const raw = localStorage.getItem(`trademind_memory_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function TradeMindApp() {
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    const local = loadMemoryLocally(id);
    if (local) setMemory(local);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !userId) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const currentMemory = loadMemoryLocally(userId);

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: content,
          memory: currentMemory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }

      const data: AgentResponse = await res.json();

      const agentMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: "agent",
        content: data.message,
        timestamp: new Date().toISOString(),
        reasoning: data.reasoning,
        action: data.action,
      };

      setMessages((prev) => [...prev, agentMsg]);
      setMemory(data.updated_memory);
      saveMemoryLocally(data.updated_memory);

    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: "agent",
        content: `Something went wrong: ${detail}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading]);

  const handleConnect = async () => {
    if (walletAddress) return;
    try {
      const win = window as unknown as {
        ethereum?: { request: (a: { method: string }) => Promise<string[]> };
      };
      if (win.ethereum) {
        const accounts = await win.ethereum.request({ method: "eth_requestAccounts" });
        if (accounts[0]) setWalletAddress(accounts[0]);
      } else {
        setWalletAddress("0xdemo" + Math.random().toString(16).slice(2, 12));
      }
    } catch {
      setWalletAddress("0xdemo" + Math.random().toString(16).slice(2, 12));
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all memory? This cannot be undone.")) return;
    localStorage.removeItem(`trademind_memory_${userId}`);
    setMemory(null);
    setMessages([]);
  };

  return (
    <div className="app-shell bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <Header
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onReset={handleReset}
        userId={userId}
      />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSend={sendMessage}
            inputValue={inputValue}
            onInputChange={setInputValue}
          />
        </main>
        <aside className="hidden lg:flex flex-col w-72 border-l border-zinc-800/60 overflow-hidden flex-shrink-0">
          <MemoryInsightsPanel memory={memory} isLoading={isLoading} />
        </aside>
      </div>

      <div className="lg:hidden fixed bottom-20 right-4 z-10">
        <button
          onClick={() => setShowInsights((v) => !v)}
          className="w-10 h-10 rounded-xl bg-violet-600 shadow-lg flex items-center justify-center text-white text-xs font-bold"
        >M</button>
      </div>

      {showInsights && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/60"
          onClick={() => setShowInsights(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <MemoryInsightsPanel memory={memory} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
}