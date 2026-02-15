import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PayTollClient } from './client.js';
import type { InputSchema } from './types.js';
import { convertInputSchema } from './schema-converter.js';
import { executeTransaction } from './executor.js';
import { log } from './config.js';

/** Fields auto-injected from the wallet — hidden from the LLM schema. */
const WALLET_INJECTED_FIELDS = ['userAddress'];

export async function registerAllTools(server: McpServer, client: PayTollClient): Promise<void> {
  const meta = await client.fetchMeta();
  log(`Found ${meta.endpoints.length} endpoints`);
  if (client.account) {
    log(`Wallet auto-inject for: ${WALLET_INJECTED_FIELDS.join(', ')} → ${client.account.address}`);
  } else {
    log('Wallet auto-inject disabled (no PRIVATE_KEY configured)');
  }

  for (const endpoint of meta.endpoints) {
    if (!endpoint.inputSchema) {
      log(`Skipping ${endpoint.name}: no inputSchema`);
      continue;
    }

    // Check if this endpoint uses any wallet-injected fields
    const hasWalletField = WALLET_INJECTED_FIELDS.some(
      (f) => f in endpoint.inputSchema.properties,
    );

    // Strip wallet-injected fields from the schema exposed to the LLM
    const schemaForLLM = hasWalletField
      ? stripFields(endpoint.inputSchema, WALLET_INJECTED_FIELDS)
      : endpoint.inputSchema;

    const shape = convertInputSchema(schemaForLLM);
    const description = `${endpoint.description} (Price: ${endpoint.price})`;

    server.tool(
      endpoint.name,
      description,
      shape,
      async (params) => {
        try {
          // Auto-inject wallet address for fields the LLM doesn't see
          if (hasWalletField && !client.account) {
            throw new Error(
              `${endpoint.name} requires wallet context. Configure PRIVATE_KEY (or keychain/secret service settings).`
            );
          }

          const enrichedParams = hasWalletField && client.account
            ? { ...params, userAddress: client.account.address }
            : params;

          const raw = await client.callEndpoint(endpoint.path, endpoint.method, enrichedParams);
          const result = await executeTransaction(raw, client.account);
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

    log(`Registered tool: ${endpoint.name} (${endpoint.method} ${endpoint.path})${hasWalletField ? ' [wallet auto-inject]' : ''}`);
  }

  log(`Registered ${meta.endpoints.length} tools`);
}

/** Return a copy of the input schema with the given fields removed. */
function stripFields(schema: InputSchema, fields: string[]) {
  const stripped = new Set(fields);
  const properties = { ...schema.properties };
  for (const f of stripped) delete properties[f];
  return {
    ...schema,
    properties,
    required: schema.required?.filter((r) => !stripped.has(r)),
  };
}
