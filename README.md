# paytoll-mcp

MCP server for PayToll — DeFi intelligence and crypto utilities powered by x402 micro-payments on Base. No API keys, no subscriptions. Your AI agent pays per call in USDC.

## Quick Start

```bash
PRIVATE_KEY=0xYourKey npx -y paytoll-mcp
```

The server connects to the PayToll API, discovers all available tools, and registers them over stdio. Your agent can immediately start querying DeFi data and crypto utilities.

## Requirements

- Node.js 20+
- Wallet private key with USDC on Base (+ a small amount of ETH for gas)

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Wallet private key (hex, 0x-prefixed) | **required** |
| `PAYTOLL_API_URL` | PayToll API endpoint | `https://api.paytoll.io` |

## Claude Desktop

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

Restart Claude Desktop. You'll see PayToll tools available in the tools menu.

## Cursor

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

## OpenClaw

```
/install paytoll
```

Then set your `PRIVATE_KEY` in OpenClaw's environment settings.

## Available Tools

### DeFi Intelligence (Aave)

| Tool | Description | Price |
|------|-------------|-------|
| `aave-best-yield` | Find best supply APY for an asset across chains | $0.01 |
| `aave-best-borrow` | Find lowest borrow APR for an asset | $0.01 |
| `aave-markets` | Get all Aave v3 market data | $0.005 |
| `aave-health-factor` | Calculate user's health factor | $0.005 |
| `aave-user-positions` | Get user's supply/borrow positions | $0.01 |

### Crypto Utilities

| Tool | Description | Price |
|------|-------------|-------|
| `crypto-price` | Get token prices from CoinGecko | $0.001 |
| `ens-lookup` | Resolve ENS names to addresses | $0.001 |
| `wallet-validator` | Validate wallet addresses | $0.0005 |

Additional tools (Aave transactions, LLM proxies) are also available and will be registered automatically.

## How It Works

```
AI Agent (Claude, Cursor, etc.)
  │  stdio JSON-RPC
  ▼
paytoll-mcp
  │  1. Startup: GET /v1/meta → discover endpoints → register MCP tools
  │  2. Tool call: POST endpoint → 402 → auto-sign USDC payment → retry → result
  ▼
PayToll API (api.paytoll.io)
```

Payment is invisible to the agent. It calls a tool, the MCP server handles the x402 payment flow, and returns the data.

## License

MIT
