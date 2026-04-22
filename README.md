# TradeMind — Onchain AI Trading Agent

A personal onchain AI agent that learns from your trading behavior, stores persistent memory, and evolves its responses over time.

> Not a chatbot. A system with memory.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000. No API key required — adaptive fallback works out of the box.

## Optional: Add AI

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## Architecture

```
types/index.ts              All TypeScript interfaces
lib/storage/index.ts        Mock 0G Storage (file-backed KV per user)
lib/agent/behavior.ts       Pattern extraction + behavior learning
lib/agent/reasoning.ts      AI prompting layer (OpenAI + fallback)
lib/agent/index.ts          Orchestrator
app/api/agent/route.ts      API: POST (chat) + GET (memory/reset)
app/page.tsx                Dashboard
components/ChatPanel.tsx             Chat interface
components/MemoryInsightsPanel.tsx   Live memory sidebar
components/Header.tsx                Nav + wallet connect
```

## Agent Flow

User Input → Fetch Memory → Extract Signals → Update Behavior Tags → Build Prompt → AI Inference → Handle Action → Persist → Respond

## Memory Structure

Stored in `.trademind-storage/<userId>.json` (simulates 0G KV):

```json
{
  "userId": "abc123",
  "risk_profile": "aggressive",
  "user_behavior": [{ "tag": "fomo_driven", "count": 3, "description": "..." }],
  "trade_history": [{ "asset": "ETH", "direction": "long", "simulated": true }],
  "notes": ["[4/22] fomo_driven detected: 'is it too late to buy ETH?'"],
  "interaction_count": 7
}
```

## Detected Behavior Patterns

| Tag | Trigger |
|-----|---------|
| `late_entry_anxiety` | "too late", "missed it", "already pumped" |
| `fomo_driven` | "FOMO", "everyone is buying", "mooning" |
| `risk_averse` | "safe", "too risky", "worried" |
| `panic_seller` | "sell all", "crashing", "dump" |
| `high_conviction` | "all in", "double down", "ape in" |
| `methodical_accumulator` | "DCA", "average in", "scale in" |
| `bearish_tendency` | "short", "overvalued", "bubble" |
| `long_term_holder` | "HODL", "long term", "patience" |

## API

`POST /api/agent` — `{ userId, message }` → `{ message, reasoning, action, updated_memory, behavioral_signals }`

`GET /api/agent?userId=...` — fetch memory

`GET /api/agent?userId=...&action=reset` — reset memory

## Production Path (0G Integration)

1. Replace `lib/storage/index.ts` with 0G SDK (`readKV`, `writeKV`, `appendLog`)
2. Set `OPENAI_BASE_URL` to your 0G Compute node
3. Add real wallet signing via `ethers.js` (already installed)