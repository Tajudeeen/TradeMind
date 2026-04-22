"use client";

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

export default function TradeMindApp() {
  // Empty string on server, real ID set after hydration via useEffect
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  // Client-only: read/create userId from localStorage after hydration
  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  // Load memory once userId is ready
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/agent?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => { if (data.memory) setMemory(data.memory); })
      .catch(() => {});
  }, [userId]);

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
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: content }),
      });

      if (!res.ok) throw new Error("Agent request failed");
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
    } catch {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: "agent",
        content: "Something went wrong. Check your configuration and try again.",
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
    await fetch(`/api/agent?userId=${userId}&action=reset`);
    setMemory(null);
    setMessages([]);
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <Header
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onReset={handleReset}
        userId={userId}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
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

      {/* Mobile memory toggle */}
      <div className="lg:hidden fixed bottom-20 right-4 z-10">
        <button
          onClick={() => setShowInsights((v) => !v)}
          className="w-10 h-10 rounded-xl bg-violet-600 shadow-lg flex items-center justify-center text-white text-xs font-bold"
        >
          M
        </button>
      </div>

      {/* Mobile memory drawer */}
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