import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import type { PayTollMeta } from './types.js';
import { log } from './config.js';

export class PayTollClient {
  private apiUrl: string;
  private fetchWithPayment: typeof fetch;

  constructor(apiUrl: string, privateKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // strip trailing slash

    const signer = privateKeyToAccount(privateKey as `0x${string}`);
    const client = new x402Client();
    registerExactEvmScheme(client, { signer });
    this.fetchWithPayment = wrapFetchWithPayment(fetch, client);

    log(`Wallet: ${signer.address}`);
  }

  async fetchMeta(): Promise<PayTollMeta> {
    const url = `${this.apiUrl}/v1/meta?detailed=true`;
    log(`Fetching metadata from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<PayTollMeta>;
  }

  async callEndpoint(path: string, method: string, input: Record<string, unknown>): Promise<unknown> {
    const url = `${this.apiUrl}${path}`;

    const response = await this.fetchWithPayment(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `API error ${response.status}: ${typeof data === 'object' && data !== null && 'error' in data ? (data as any).error : JSON.stringify(data)}`
      );
    }

    return data;
  }
}
