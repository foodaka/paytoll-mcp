# paytoll-mcp

MCP server for [PayToll](https://paytoll.io) — 27 tools for DeFi, swaps, bridging, social, on-chain data, and AI, powered by [x402](https://www.x402.org/) micro-payments on Base. No API keys, no subscriptions. Your AI agent pays per call in USDC.

## Quick Start

```bash
PRIVATE_KEY=0xYourKey npx -y paytoll-mcp
```

The server connects to the PayToll API, discovers all available tools, and registers them over stdio. Your agent can immediately start querying DeFi data, swapping tokens, searching Twitter, prompting LLMs, and more.

> **Security:** Use a dedicated wallet with minimal funds. Do not use your main wallet. The private key is used only to sign x402 micro-payments (fractions of a cent per call) — it never leaves your machine and is never sent to any server.

## Requirements

- Node.js 20+
- A wallet private key with USDC on Base (+ a small amount of ETH for gas)

A few dollars of USDC is enough for thousands of API calls.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Wallet private key (hex, 0x-prefixed) | **required** |
| `PAYTOLL_API_URL` | PayToll API endpoint | `https://api.paytoll.io` |

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "paytoll": {
      "command": "npx",
      "args": ["-y", "paytoll-mcp"],
      "env": {
        "PRIVATE_KEY": "0xYourPrivateKeyHere"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see PayToll tools in the tools menu.

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "paytoll": {
      "command": "npx",
      "args": ["-y", "paytoll-mcp"],
      "env": {
        "PRIVATE_KEY": "0xYourPrivateKeyHere"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "paytoll": {
      "command": "npx",
      "args": ["-y", "paytoll-mcp"],
      "env": {
        "PRIVATE_KEY": "0xYourPrivateKeyHere"
      }
    }
  }
}
```

### OpenClaw

```
/install paytoll
```

Then set your `PRIVATE_KEY` in OpenClaw's environment settings.

## Available Tools (27)

### DeFi Intelligence — Aave V3

| Tool | Description | Price |
|------|-------------|-------|
| `aave-best-yield` | Find best supply APY for an asset across all chains | $0.01 |
| `aave-best-borrow` | Find lowest borrow APR for an asset across all chains | $0.01 |
| `aave-markets` | Overview of all Aave V3 markets with TVL and rates | $0.005 |
| `aave-health-factor` | Get health factor and liquidation risk for a position | $0.005 |
| `aave-user-positions` | Get all supply/borrow positions for a wallet | $0.01 |

### DeFi Transactions — Aave V3

Build unsigned transaction data for Aave operations. Returns transaction payloads for your wallet to sign — **does not broadcast or execute transactions**.

| Tool | Description | Price |
|------|-------------|-------|
| `aave-supply` | Build a supply (deposit) transaction | $0.01 |
| `aave-borrow` | Build a borrow transaction | $0.01 |
| `aave-repay` | Build a repay transaction | $0.01 |
| `aave-withdraw` | Build a withdraw transaction | $0.01 |

### DEX Swaps & Cross-Chain Bridges

Powered by [Li.Fi](https://li.fi/) aggregator. Supports same-chain swaps and cross-chain bridges across 12 networks (Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BSC, zkSync, Linea, Scroll, Fantom, Gnosis).

| Tool | Description | Price |
|------|-------------|-------|
| `swap-quote` | Get a DEX swap or cross-chain bridge quote | $0.005 |
| `swap-build` | Build a swap/bridge transaction for signing | $0.01 |
| `token-balance` | Check wallet token balance on any chain | $0.005 |

To bridge, set `fromChain` and `toChain` to different chain IDs. Li.Fi routes through optimal bridge protocols (Stargate, Across, Hop, etc.) automatically.

### On-Chain Token Data

| Tool | Description | Price |
|------|-------------|-------|
| `onchain-token-data` | Token price, supply, FDV, market cap, top pools | $0.015 |
| `onchain-token-price` | On-chain token price by contract address | $0.015 |
| `search-pools` | Search liquidity pools by name, symbol, or address | $0.015 |
| `trending-pools` | Trending pools on a network by trading activity | $0.015 |

### Social — X / Twitter

| Tool | Description | Price |
|------|-------------|-------|
| `twitter-search` | Search recent tweets (last 7 days) | $0.08 |
| `twitter-user-tweets` | Get a user's recent tweets | $0.08 |
| `twitter-tweet-lookup` | Look up tweets by ID (max 10 per call) | $0.02 |
| `twitter-user-lookup` | Look up user by username or ID | $0.02 |
| `twitter-post` | Post a tweet (requires your OAuth token) | $0.015 |

### Crypto Utilities

| Tool | Description | Price |
|------|-------------|-------|
| `crypto-price` | Real-time crypto prices (CoinGecko) | $0.015 |
| `ens-lookup` | Resolve ENS names to addresses (and reverse) | $0.001 |
| `wallet-validator` | Validate wallet addresses with checksum | $0.0005 |

### AI — LLM Proxy

| Tool | Description | Price |
|------|-------------|-------|
| `llm-openai` | GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, o3-mini | $0.01 |
| `llm-anthropic` | Claude Sonnet 4, Haiku 4, Claude 3.5 | $0.01 |
| `llm-google` | Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash | $0.01 |

All tools are discovered automatically from the API at startup.

## How It Works

```
AI Agent (Claude, Cursor, etc.)
  |  stdio JSON-RPC
  v
paytoll-mcp
  |  1. Startup: GET /v1/meta -> discover all endpoints -> register MCP tools
  |  2. Tool call: POST endpoint -> 402 -> auto-sign USDC payment -> retry -> result
  v
PayToll API (api.paytoll.io)
```

Payment is invisible to the agent. The MCP server handles the full [x402 payment protocol](https://www.x402.org/) flow automatically:

1. Agent calls a tool (e.g., `aave-best-yield`)
2. MCP server sends request to PayToll API
3. API responds with `402 Payment Required` and payment details
4. MCP server signs a USDC payment using your wallet's private key
5. MCP server retries with the signed payment
6. API verifies payment, executes the request, settles on Base
7. Result is returned to the agent

Your private key **never leaves your machine**. It is only used locally to sign EIP-712 typed data for x402 payments. The PayToll API and MCP server communicate over HTTPS — the key itself is never transmitted.

## Security

- **Use a dedicated wallet.** Create a new wallet with only the USDC/ETH you need. Do not reuse your main wallet.
- **Private key stays local.** The key is used only to sign payment authorizations on your machine. It is never sent to any server.
- **No transaction execution.** Transaction-building tools (`aave-supply`, `swap-build`, etc.) return unsigned transaction data. They do not broadcast anything on-chain.
- **Payments are micro-amounts.** Most calls cost $0.001–$0.08 in USDC. A few dollars funds thousands of calls.
- **Open source.** This entire MCP server is open source — audit it yourself.

## Development

```bash
git clone https://github.com/foodaka/paytoll-mcp.git
cd paytoll-mcp
npm install
npm run build
PRIVATE_KEY=0xYourKey npm start
```

## License

MIT
