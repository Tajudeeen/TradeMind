// Core memory structure persisted in 0G Storage abstraction
export interface AgentMemory {
  userId: string;
  risk_profile: "conservative" | "moderate" | "aggressive" | "unknown";
  user_behavior: BehaviorTag[];
  trade_history: TradeRecord[];
  notes: string[];
  interaction_count: number;
  last_updated: string;
}

export interface BehaviorTag {
  tag: string;
  count: number;
  last_seen: string;
  description: string;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  asset: string;
  direction: "long" | "short" | "hold";
  reasoning: string;
  user_input: string;
  simulated: boolean;
  outcome?: "profit" | "loss" | "neutral" | "pending";
  entry_price?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  reasoning?: string;
  action?: AgentAction;
}

export interface AgentAction {
  type: "simulate_trade" | "update_risk" | "flag_behavior" | "none";
  payload?: Record<string, unknown>;
  label: string;
}

export interface AgentResponse {
  message: string;
  reasoning: string;
  action: AgentAction;
  updated_memory: AgentMemory;
  behavioral_signals: string[];
}

export interface MemoryInsights {
  risk_profile: string;
  top_patterns: { tag: string; count: number; description: string }[];
  trade_count: number;
  interaction_count: number;
  notes: string[];
  recent_trades: TradeRecord[];
}