# PayToll MCP Server

MCP server that exposes all PayToll API endpoints as tools for AI agents. When an agent calls a tool, the MCP server handles x402 payment automatically — signs the transaction with your wallet, pays in USDC on Base, and returns the result.

Works with Claude Desktop, Cursor, and any MCP-compatible client.

## How It Works

```
Claude Desktop / Cursor / MCP Client
  │
  │  stdio (JSON-RPC)
  ▼
PayToll MCP Server (this package)
  │
  │  1. On startup: GET /v1/meta?detailed=true
  │     → discovers all endpoints + input schemas
  │     → converts JSON Schema → Zod → registers MCP tools
  │
  │  2. On tool call (e.g., "aave-best-yield"):
  │     → POST /v1/aave/best-yield (no payment yet)
  │     → gets 402 + payment requirements
  │     → @x402/fetch auto-signs EIP-712 with wallet key
  │     → retries with payment signature
  │     → API verifies, settles USDC on Base, runs handler
  │     → returns JSON result to agent
  ▼
PayToll API Server (localhost:3000)
```

The agent never sees the payment flow. It calls a tool with parameters and gets data back.

## Prerequisites

- Node.js 20+
- Running PayToll API server (`npm run dev` in project root)
- Wallet private key with Base Sepolia USDC + ETH for gas

## Setup

```bash
cd mcp
npm install
cp .env.example .env
```

Edit `.env`:

```
PAYTOLL_API_URL=http://localhost:3000
PRIVATE_KEY=0xYourPrivateKeyHere
```

## Build

```bash
npm run build
```

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "paytoll": {
      "command": "node",
      "args": ["/absolute/path/to/paytoll/mcp/dist/index.js"],
      "env": {
        "PAYTOLL_API_URL": "http://localhost:3000",
        "PRIVATE_KEY": "0xYourPrivateKeyHere"
      }
    }
  }
}
```

Restart Claude Desktop. You should see 15 PayToll tools available.

## Available Tools

### DeFi — Aave Read

| Tool | Description | Price |
|------|-------------|-------|
| `aave-best-yield` | Find best supply APY for an asset across chains | $0.01 |
| `aave-best-borrow` | Find lowest borrow APR for an asset | $0.01 |
| `aave-markets` | Get all Aave v3 market data | $0.005 |
| `aave-health-factor` | Calculate user's health factor | $0.005 |
| `aave-user-positions` | Get user's supply/borrow positions | $0.01 |

### DeFi — Aave Transactions

| Tool | Description | Price |
|------|-------------|-------|
| `aave-supply` | Generate supply transaction data | $0.01 |
| `aave-borrow` | Generate borrow transaction data | $0.01 |
| `aave-repay` | Generate repay transaction data | $0.01 |
| `aave-withdraw` | Generate withdraw transaction data | $0.01 |

### Crypto Utilities

| Tool | Description | Price |
|------|-------------|-------|
| `crypto-price` | Get token prices from CoinGecko | $0.001 |
| `ens-lookup` | Resolve ENS names to addresses | $0.001 |
| `wallet-validator` | Validate wallet addresses | $0.0005 |

### AI (LLM Proxy)

| Tool | Description | Price |
|------|-------------|-------|
| `llm-openai` | Query OpenAI GPT models | $0.01 |
| `llm-anthropic` | Query Anthropic Claude models | $0.01 |
| `llm-google` | Query Google Gemini models | $0.01 |

## Architecture

```
mcp/src/
├── index.ts            # Entry point — McpServer + StdioServerTransport
├── config.ts           # Loads PAYTOLL_API_URL + PRIVATE_KEY from env
├── client.ts           # API client with @x402/fetch payment wrapper
├── registry.ts         # Fetches /v1/meta, registers all tools
├── schema-converter.ts # JSON Schema → Zod (string, number, integer, boolean, array, object)
└── types.ts            # TypeScript types for /v1/meta response
```

Key design decisions:
- **Dynamic tool registration** — Tools are discovered at startup from the API, not hardcoded. Add a new plugin to PayToll and the MCP server picks it up automatically.
- **ESM package** — The MCP SDK requires ESM. This package uses `"type": "module"` with `module: "NodeNext"`, separate from the root project's CommonJS setup.
- **stderr for logging** — stdout is reserved for MCP JSON-RPC. All log output goes to stderr.

## Development

```bash
npm run dev    # tsx, no build step
npm run build  # tsc to dist/
npm start      # node dist/index.js
```
