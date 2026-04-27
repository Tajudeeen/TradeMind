export interface AgentMemory {
  userId: string;
  risk_profile: "conservative" | "moderate" | "aggressive" | "unknown";
  user_behavior: BehaviorTag[];
  trade_history: TradeRecord[];
  notes: string[];
  interaction_count: number;
  last_updated: string;
  zg_root_hash?: string;
  zg_tx_hash?: string;
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
  zg_proof?: ZGProof;
}

export interface AgentAction {
  type: "simulate_trade" | "update_risk" | "flag_behavior" | "none";
  payload?: Record<string, unknown>;
  label: string;
}

export interface ZGProof {
  tx_hash: string;
  root_hash: string;
  tx_url: string;
  stored_on_0g: boolean;
}

export interface AgentResponse {
  message: string;
  reasoning: string;
  action: AgentAction;
  updated_memory: AgentMemory;
  behavioral_signals: string[];
  zg_proof?: ZGProof;
}