import dotenv from 'dotenv';
import { resolve } from 'path';
import { execFileSync, execSync } from 'child_process';

// Load .env from mcp/ directory
dotenv.config({ path: resolve(import.meta.dirname, '../.env') });

function readPrivateKeyFromEnv(): string {
  return process.env.PRIVATE_KEY?.trim() || '';
}

function readPrivateKeyFromMacosKeychain(): string {
  const service = process.env.PRIVATE_KEY_KEYCHAIN_SERVICE?.trim();
  if (!service) return '';
  if (process.platform !== 'darwin') {
    log('ERROR: PRIVATE_KEY_KEYCHAIN_SERVICE is only supported on macOS (darwin)');
    process.exit(1);
  }

  const account = process.env.PRIVATE_KEY_KEYCHAIN_ACCOUNT?.trim() || process.env.USER || '';
  try {
    const key = execFileSync(
      'security',
      ['find-generic-password', '-a', account, '-s', service, '-w'],
      { encoding: 'utf8' }
    ).trim();
    return key;
  } catch (error) {
    log(`ERROR: failed to read key from macOS Keychain service "${service}" for account "${account}"`);
    if (error instanceof Error && error.message) {
      log(`Keychain lookup detail: ${error.message}`);
    }
    process.exit(1);
  }
}

function readPrivateKeyFromLinuxSecretService(): string {
  const service = process.env.PRIVATE_KEY_SECRET_SERVICE?.trim();
  if (!service) return '';
  if (process.platform !== 'linux') {
    log('ERROR: PRIVATE_KEY_SECRET_SERVICE is only supported on Linux');
    process.exit(1);
  }

  const account = process.env.PRIVATE_KEY_SECRET_ACCOUNT?.trim() || process.env.USER || '';
  try {
    const key = execFileSync(
      'secret-tool',
      ['lookup', 'service', service, 'account', account],
      { encoding: 'utf8' }
    ).trim();
    return key;
  } catch (error) {
    log(`ERROR: failed to read key from Linux Secret Service (service="${service}", account="${account}")`);
    if (error instanceof Error && error.message) {
      log(`Secret Service lookup detail: ${error.message}`);
    }
    process.exit(1);
  }
}

function readPrivateKeyFromCommand(): string {
  const command = process.env.PRIVATE_KEY_COMMAND?.trim();
  if (!command) return '';

  try {
    const key = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: '/bin/sh' }).trim();
    return key;
  } catch (error) {
    log('ERROR: failed to execute PRIVATE_KEY_COMMAND');
    if (error instanceof Error && error.message) {
      log(`PRIVATE_KEY_COMMAND detail: ${error.message}`);
    }
    process.exit(1);
  }
}

function resolvePrivateKey(): string {
  return (
    readPrivateKeyFromEnv() ||
    readPrivateKeyFromMacosKeychain() ||
    readPrivateKeyFromLinuxSecretService() ||
    readPrivateKeyFromCommand() ||
    ''
  );
}

export const config = {
  apiUrl: process.env.PAYTOLL_API_URL || 'https://api.paytoll.io',
  privateKey: resolvePrivateKey(),
  freeTierDailyLimit: Number.parseInt(process.env.FREE_TIER_DAILY_LIMIT || '50', 10) || 50,
};

export function log(message: string): void {
  process.stderr.write(`[paytoll-mcp] ${message}\n`);
}

export function validateConfig(): void {
  if (!config.privateKey) {
    log(`Running in free tier mode (${config.freeTierDailyLimit} calls/day). Add PRIVATE_KEY for unlimited paid access.`);
    return;
  }

  if (!config.privateKey.startsWith('0x')) {
    log('ERROR: PRIVATE_KEY must start with 0x');
    process.exit(1);
  }
}
