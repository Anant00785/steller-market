/**
 * Freighter wallet integration + Soroban transaction builder.
 * Uses @stellar/freighter-api and @stellar/stellar-sdk on the client side.
 */

import type { Outcome } from '@/types';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

// ─── Freighter helpers (dynamic import — no SSR) ─────────────────────────────

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { isConnected } = await import('@stellar/freighter-api');
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<string | null> {
  try {
    const { requestAccess, getAddress } = await import('@stellar/freighter-api');
    await requestAccess();
    const result = await getAddress();
    return result.address ?? null;
  } catch {
    return null;
  }
}

export async function getFreighterAddress(): Promise<string | null> {
  try {
    const { getAddress } = await import('@stellar/freighter-api');
    const result = await getAddress();
    return result.address ?? null;
  } catch {
    return null;
  }
}

// ─── Soroban transaction builder ─────────────────────────────────────────────

export async function buildAndSubmitBet(
  bettor: string,
  marketId: number,
  outcome: Outcome,
  amountStroops: bigint
): Promise<string> {
  const {
    rpc: stellarRpc,
    Contract,
    Networks,
    TransactionBuilder,
    BASE_FEE,
    nativeToScVal,
  } = await import('@stellar/stellar-sdk');
  const { signTransaction } = await import('@stellar/freighter-api');

  const rpc = new stellarRpc.Server(RPC_URL);
  const account = await rpc.getAccount(bettor);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'place_bet',
        nativeToScVal(BigInt(marketId), { type: 'u64' }),
        nativeToScVal(bettor, { type: 'address' }),
        nativeToScVal({ [outcome]: null }, { type: 'enum' }),
        nativeToScVal(amountStroops, { type: 'i128' })
      )
    )
    .setTimeout(60)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (stellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const assembled = stellarRpc.assembleTransaction(tx, simResult).build();
  const xdrTx = assembled.toXDR();

  const signResult = await signTransaction(xdrTx, {
    networkPassphrase: Networks.TESTNET,
  });

  const { Transaction } = await import('@stellar/stellar-sdk');
  const signedTx = new Transaction(signResult.signedTxXdr, Networks.TESTNET);
  const submitResult = await rpc.sendTransaction(signedTx);

  if (submitResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(submitResult.errorResult)}`);
  }

  return submitResult.hash;
}

export async function buildAndSubmitClaim(
  bettor: string,
  marketId: number
): Promise<string> {
  const {
    rpc: stellarRpc,
    Contract,
    Networks,
    TransactionBuilder,
    BASE_FEE,
    nativeToScVal,
  } = await import('@stellar/stellar-sdk');
  const { signTransaction } = await import('@stellar/freighter-api');

  const rpc = new stellarRpc.Server(RPC_URL);
  const account = await rpc.getAccount(bettor);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'claim_reward',
        nativeToScVal(BigInt(marketId), { type: 'u64' }),
        nativeToScVal(bettor, { type: 'address' })
      )
    )
    .setTimeout(60)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (stellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const assembled = stellarRpc.assembleTransaction(tx, simResult).build();
  const xdrTx = assembled.toXDR();
  const signResult = await signTransaction(xdrTx, {
    networkPassphrase: Networks.TESTNET,
  });

  const { Transaction } = await import('@stellar/stellar-sdk');
  const signedTx = new Transaction(signResult.signedTxXdr, Networks.TESTNET);
  const submitResult = await rpc.sendTransaction(signedTx);

  if (submitResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(submitResult.errorResult)}`);
  }

  return submitResult.hash;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert stroops (i128 string) to a human-readable USDC amount. */
export function stroopsToUsdc(stroops: string | bigint): string {
  const val = BigInt(stroops);
  const whole = val / 10_000_000n;
  const frac = (val % 10_000_000n).toString().padStart(7, '0').slice(0, 2);
  return `${whole}.${frac}`;
}

/** Convert USDC float to stroops bigint. */
export function usdcToStroops(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10_000_000));
}

/** Shorten a Stellar address for display. */
export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/** Format countdown from seconds remaining. */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}
