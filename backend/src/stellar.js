import {
  rpc as stellarRpc,
  Contract,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import 'dotenv/config';

const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = process.env.CONTRACT_ID;
const NETWORK_PASSPHRASE = Networks.TESTNET;

const rpc = new stellarRpc.Server(RPC_URL, { allowHttp: false });

/**
 * Simulate a read-only Soroban contract call (no signing needed).
 */
async function simulateCall(method, args = []) {
  const adminKeypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY);
  const account = await rpc.getAccount(adminKeypair.publicKey());

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);

  if (stellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  return scValToNative(simResult.result.retval);
}

/**
 * Sign and submit a state-changing Soroban transaction.
 */
export async function invokeContract(method, args = []) {
  const adminKeypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY);
  const account = await rpc.getAccount(adminKeypair.publicKey());
  const contract = new Contract(CONTRACT_ID);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (stellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  tx = stellarRpc.assembleTransaction(tx, simResult).build();
  tx.sign(adminKeypair);

  const response = await rpc.sendTransaction(tx);
  if (response.status === 'ERROR') {
    throw new Error(`Transaction error: ${JSON.stringify(response.errorResult)}`);
  }

  // Poll for completion
  let getResponse = await rpc.getTransaction(response.hash);
  while (getResponse.status === stellarRpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise(r => setTimeout(r, 1000));
    getResponse = await rpc.getTransaction(response.hash);
  }

  if (getResponse.status === stellarRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed: ${JSON.stringify(getResponse)}`);
  }

  return getResponse;
}

// ─── Market reads ─────────────────────────────────────────────────────────────

export async function getOnChainMarket(marketId) {
  try {
    const data = await simulateCall('get_market', [
      nativeToScVal(BigInt(marketId), { type: 'u64' }),
    ]);
    return data;
  } catch (e) {
    return null;
  }
}

export async function getOnChainMarketCount() {
  try {
    return await simulateCall('get_market_count', []);
  } catch (e) {
    return 0;
  }
}

// ─── Compute live odds ────────────────────────────────────────────────────────

export function computeOdds(yesTotal, noTotal) {
  const yes = BigInt(yesTotal || '0');
  const no = BigInt(noTotal || '0');
  const total = yes + no;
  if (total === 0n) return { yesPct: 50, noPct: 50 };
  const yesPct = Number((yes * 10000n) / total) / 100;
  return { yesPct, noPct: 100 - yesPct };
}

// ─── RPC health check ─────────────────────────────────────────────────────────

export async function getRpcHealth() {
  try {
    const health = await rpc.getHealth();
    return health;
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}
