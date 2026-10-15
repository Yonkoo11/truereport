/**
 * Lace wallet connection for /doctor and /registrar.
 * UNTESTED end to end (F-036): written to the Midnight example dapp pattern, never run against a live Lace.
 */
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Transaction, type Binding, type FinalizedTransaction, type Proof, type SignatureEnabled } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { CompiledTrueReportContract } from '../../../contract/src/index';
import { CONTRACT_ADDRESS, NETWORK } from './config';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';

export const NO_LACE = 'Midnight Lace wallet not found. Install Lace and switch it to Preview, then reload.';

export type TxResult = { public: { txId: string; blockHeight: number } };
export type Registry = {
  callTx: {
    addDoctor(leaf: Uint8Array): Promise<TxResult>;
    issueReport(reportHash: Uint8Array, doctorId: Uint8Array, salt: Uint8Array): Promise<TxResult>;
    revokeReport(commitment: Uint8Array): Promise<TxResult>;
  };
};

const findWallet = (): InitialAPI | undefined =>
  Object.values(window.midnight ?? {}).find(
    (w): w is InitialAPI => !!w && typeof w === 'object' && 'apiVersion' in w && String(w.apiVersion).startsWith('4.'),
  );

async function connectWallet(): Promise<ConnectedAPI> {
  for (let waited = 0; waited < 3000; waited += 100) {
    const w = findWallet();
    if (w) return w.connect(NETWORK.id);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(NO_LACE);
}

/** Connect Lace and open the registry contract with `secretKey` as this caller's private state. */
export async function openRegistry(privateStateId: string, secretKey: Uint8Array): Promise<Registry> {
  const api = await connectWallet();
  const config = await api.getConfiguration();
  const addresses = await api.getShieldedAddresses();
  const zk = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const providers = {
    privateStateProvider: inMemoryPrivateStateProvider(),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(config.proverServerUri ?? NETWORK.proofServer, zk),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const received = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(received.tx));
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction) => {
        await api.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
  const contract = await findDeployedContract(providers as never, {
    compiledContract: CompiledTrueReportContract as never,
    contractAddress: CONTRACT_ADDRESS,
    privateStateId,
    initialPrivateState: { secretKey },
  } as never);
  return contract as unknown as Registry;
}

/** Turn contract and witness failures into the copy the brief names. */
export function plainError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes('not on the registry') || m.includes('not a registered doctor')) return 'This key is not on the registry yet. Send your registry code to the registrar.';
  if (m.includes('only the registrar')) return 'Only the registrar key can add doctors.';
  return m;
}
