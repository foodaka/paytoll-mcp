import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from mcp/ directory
dotenv.config({ path: resolve(import.meta.dirname, '../.env') });

export const config = {
  apiUrl: process.env.PAYTOLL_API_URL || 'http://localhost:3000',
  privateKey: process.env.PRIVATE_KEY || '',
};

export function log(message: string): void {
  process.stderr.write(`[paytoll-mcp] ${message}\n`);
}

export function validateConfig(): void {
  if (!config.privateKey) {
    log('ERROR: PRIVATE_KEY environment variable is required');
    log('Set it in mcp/.env or as an environment variable');
    process.exit(1);
  }
  if (!config.privateKey.startsWith('0x')) {
    log('ERROR: PRIVATE_KEY must start with 0x');
    process.exit(1);
  }
}
