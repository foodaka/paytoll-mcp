import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import type { PayTollMeta } from './types.js';
import { log } from './config.js';

export class PayTollClient {
  private apiUrl: string;
  private fetchWithPayment?: typeof fetch;
  public readonly account?: PrivateKeyAccount;

  constructor(apiUrl: string, privateKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // strip trailing slash

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      const client = new x402Client();
      registerExactEvmScheme(client, { signer: this.account });
      this.fetchWithPayment = wrapFetchWithPayment(fetch, client);
      log(`Wallet: ${this.account.address}`);
    } else {
      log('Wallet: none (free tier only until limit is exhausted)');
    }
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

    const fetcher = this.fetchWithPayment || fetch;
    const response = await fetcher(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (response.status === 402 && !this.fetchWithPayment) {
      throw new Error(
        'Free tier exhausted or endpoint requires payment. Configure PRIVATE_KEY (or keychain/secret service settings) to enable paid access.'
      );
    }

    if (!response.ok) {
      throw new Error(
        `API error ${response.status}: ${typeof data === 'object' && data !== null && 'error' in data ? (data as any).error : JSON.stringify(data)}`
      );
    }

    return data;
  }
}
