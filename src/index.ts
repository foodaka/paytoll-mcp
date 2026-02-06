#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config, log, validateConfig } from './config.js';
import { PayTollClient } from './client.js';
import { registerAllTools } from './registry.js';

async function main() {
  validateConfig();

  const server = new McpServer({
    name: 'paytoll',
    version: '1.0.0',
  });

  // Resource for service discovery
  server.resource('info', 'paytoll://info', async () => ({
    contents: [
      {
        uri: 'paytoll://info',
        mimeType: 'application/json',
        text: JSON.stringify({
          name: 'PayToll MCP Server',
          description: 'Micro-payment API platform on x402 protocol. AI agents pay per call using stablecoins.',
          apiUrl: config.apiUrl,
        }),
      },
    ],
  }));

  // Create API client and register tools
  const client = new PayTollClient(config.apiUrl, config.privateKey);

  try {
    await registerAllTools(server, client);
  } catch (error) {
    log(`Failed to register tools: ${(error as Error).message}`);
    process.exit(1);
  }

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('Server running on stdio');
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});
