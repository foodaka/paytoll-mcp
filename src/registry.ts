import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PayTollClient } from './client.js';
import { convertInputSchema } from './schema-converter.js';
import { log } from './config.js';

export async function registerAllTools(server: McpServer, client: PayTollClient): Promise<void> {
  const meta = await client.fetchMeta();
  log(`Found ${meta.endpoints.length} endpoints`);

  for (const endpoint of meta.endpoints) {
    if (!endpoint.inputSchema) {
      log(`Skipping ${endpoint.name}: no inputSchema`);
      continue;
    }

    const shape = convertInputSchema(endpoint.inputSchema);
    const description = `${endpoint.description} (Price: ${endpoint.price})`;

    server.tool(
      endpoint.name,
      description,
      shape,
      async (params) => {
        try {
          const result = await client.callEndpoint(endpoint.path, endpoint.method, params);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error calling ${endpoint.name}: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    log(`Registered tool: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
  }

  log(`Registered ${meta.endpoints.length} tools`);
}
