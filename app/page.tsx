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
  const [activeTab, setActiveTab] = useState<"chat" | "memory">("chat");

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    const local = loadMemoryLocally(id);
    if (local) setMemory(local);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !userId) return;

    setActiveTab("chat");

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
        body: JSON.stringify({ userId, message: content, memory: currentMemory }),
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
      setMessages((prev) => [...prev, {
        id: Math.random().toString(36).slice(2),
        role: "agent",
        content: `Something went wrong: ${detail}`,
        timestamp: new Date().toISOString(),
      }]);
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

  const handleMemoryToggle = () => {
    setActiveTab((t) => t === "memory" ? "chat" : "memory");
  };

  return (
    <div className="app-shell bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <Header
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onReset={handleReset}
        onMemoryToggle={handleMemoryToggle}
        userId={userId}
        activeTab={activeTab}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <main className={`flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 ${
          activeTab === "memory" ? "hidden lg:flex" : "flex"
        }`}>
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSend={sendMessage}
            inputValue={inputValue}
            onInputChange={setInputValue}
          />
        </main>

        <aside className={`flex flex-col overflow-hidden flex-shrink-0 ${
          activeTab === "memory"
            ? "flex w-full lg:w-72 lg:border-l lg:border-zinc-800/60"
            : "hidden lg:flex lg:w-72 lg:border-l lg:border-zinc-800/60"
        }`}>
          <MemoryInsightsPanel memory={memory} isLoading={isLoading} />
        </aside>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden flex-shrink-0 border-t border-zinc-800/60 flex">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
            activeTab === "chat" ? "text-violet-400" : "text-zinc-600"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
        <button
          onClick={() => setActiveTab("memory")}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors relative ${
            activeTab === "memory" ? "text-violet-400" : "text-zinc-600"
          }`}
        >
          {memory && memory.interaction_count > 0 && (
            <span className="absolute top-2 right-[calc(50%-14px)] w-1.5 h-1.5 rounded-full bg-violet-500" />
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Memory
        </button>
      </div>
    </div>
  );
}