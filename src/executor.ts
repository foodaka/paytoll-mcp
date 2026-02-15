/**
 * Transaction Executor
 *
 * Detects on-chain transaction responses from plugins (e.g. Aave supply/borrow/repay/withdraw)
 * and automatically signs + submits them using the MCP server's wallet.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type Chain,
  type LocalAccount,
} from 'viem';
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
} from 'viem/chains';
import { log } from './config.js';

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  43114: avalanche,
};

interface TransactionData {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
}

interface ReadyResponse {
  type: 'ready';
  transaction: TransactionData;
  [key: string]: unknown;
}

interface ApprovalRequiredResponse {
  type: 'approval_required';
  approval: TransactionData;
  transaction: TransactionData;
  [key: string]: unknown;
}

interface InsufficientBalanceResponse {
  type: 'insufficient_balance';
  [key: string]: unknown;
}

type ExecutableResponse = ReadyResponse | ApprovalRequiredResponse | InsufficientBalanceResponse;

function isTransactionData(obj: unknown): obj is TransactionData {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.to === 'string' &&
    typeof t.data === 'string' &&
    typeof t.chainId === 'number'
  );
}

function isExecutableResponse(result: unknown): result is ExecutableResponse {
  if (typeof result !== 'object' || result === null) return false;
  const r = result as Record<string, unknown>;
  if (r.type === 'ready' && isTransactionData(r.transaction)) return true;
  if (r.type === 'approval_required' && isTransactionData(r.approval) && isTransactionData(r.transaction)) return true;
  if (r.type === 'insufficient_balance') return true;
  return false;
}

async function sendAndWait(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  tx: TransactionData,
) {
  const hash = await walletClient.sendTransaction({
    account: walletClient.account!,
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value || '0'),
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 60_000,
  });

  return {
    txHash: hash,
    receipt: {
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    },
  };
}

export async function executeTransaction(
  result: unknown,
  account?: LocalAccount,
): Promise<unknown> {
  if (!isExecutableResponse(result)) return result;
  if (result.type === 'insufficient_balance') return result;
  if (!account) {
    return {
      ...result,
      execution: {
        executed: false,
        error: 'Missing PRIVATE_KEY: transaction execution requires a configured wallet.',
      },
    };
  }

  const chainId = result.transaction.chainId;
  const chain = CHAIN_MAP[chainId];
  if (!chain) {
    return {
      ...result,
      execution: { executed: false, error: `Unsupported chain ID: ${chainId}` },
    };
  }

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  log(`Executing on-chain tx (chainId=${chainId}, type=${result.type})`);

  try {
    if (result.type === 'approval_required') {
      log('Sending approval transaction...');
      const approvalResult = await sendAndWait(walletClient, publicClient, result.approval);
      log(`Approval confirmed: ${approvalResult.txHash}`);

      log('Sending main transaction...');
      const mainResult = await sendAndWait(walletClient, publicClient, result.transaction);
      log(`Main tx confirmed: ${mainResult.txHash}`);

      return {
        ...result,
        execution: {
          executed: true,
          approvalTxHash: approvalResult.txHash,
          approvalReceipt: approvalResult.receipt,
          txHash: mainResult.txHash,
          receipt: mainResult.receipt,
        },
      };
    }

    // type === 'ready'
    log('Sending transaction...');
    const mainResult = await sendAndWait(walletClient, publicClient, result.transaction);
    log(`Tx confirmed: ${mainResult.txHash}`);

    return {
      ...result,
      execution: {
        executed: true,
        txHash: mainResult.txHash,
        receipt: mainResult.receipt,
      },
    };
  } catch (error) {
    const stage = result.type === 'approval_required' ? 'approval_or_main' : 'main';
    log(`Tx execution failed (stage=${stage}): ${(error as Error).message}`);

    return {
      ...result,
      execution: {
        executed: false,
        error: (error as Error).message,
        stage,
      },
    };
  }
}
