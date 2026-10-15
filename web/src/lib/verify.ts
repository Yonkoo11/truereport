import { decodeQr, reportHashOf, doctorIdOf, fromHex, bodyHashOf, type QrPayload } from '../../../contract/src/report';
import { pureCircuits, ledger } from '../../../contract/managed/truereport/contract/index.js';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NETWORK } from './config';

export type Verdict = 'genuine' | 'revoked' | 'notfound' | 'invalid';
export type Step = 'read' | 'hash' | 'ask';
export type CheckResult = { verdict: 'invalid' } | { verdict: Exclude<Verdict, 'invalid'>; payload: QrPayload; block: number | null };

const TRIES = 3;
const GAP_MS = 2000;
export const SLOW_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The whole check runs in this browser. The only requests are indexer queries
 * carrying the contract address or nothing at all; the fragment and its fields never leave the page.
 */
export async function check(fragment: string, address: string, onStep: (s: Step) => void = () => {}): Promise<CheckResult> {
  let p: QrPayload;
  try {
    p = decodeQr(fragment);
  } catch {
    return { verdict: 'invalid' };
  }
  onStep('read');
  const c = pureCircuits.reportCommitment(await reportHashOf(p), await doctorIdOf(p.doctorName, p.doctorFolio), fromHex(p.salt));
  onStep('hash');
  const provider = indexerPublicDataProvider(NETWORK.indexer, NETWORK.indexerWS);
  for (let i = 1; ; i++) {
    try {
      const [state, block] = await Promise.all([provider.queryContractState(address), blockHeight()]);
      if (!state) throw new Error('registry contract not found on this network');
      const l = ledger(state.data);
      onStep('ask');
      const verdict = !l.issued.member(c) ? 'notfound' : l.revoked.member(c) ? 'revoked' : 'genuine';
      return { verdict, payload: p, block };
    } catch (e) {
      if (i >= TRIES) throw e;
      await sleep(GAP_MS);
    }
  }
}

/** Latest block height the indexer has seen; null if it does not answer. */
export async function blockHeight(): Promise<number | null> {
  try {
    const r = await fetch(NETWORK.indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { block { height } }' }),
    });
    const j: { data?: { block?: { height?: number } } } = await r.json();
    return typeof j.data?.block?.height === 'number' ? j.data.block.height : null;
  } catch {
    return null;
  }
}

export const bodyMatches = async (body: string, p: Pick<QrPayload, 'bodyHash' | 'salt'>): Promise<boolean> =>
  (await bodyHashOf(body, fromHex(p.salt))) === p.bodyHash;

/** Public counts for the home page line. */
export async function registryStats(address: string): Promise<{ doctors: bigint; reports: bigint; revoked: bigint } | null> {
  const state = await indexerPublicDataProvider(NETWORK.indexer, NETWORK.indexerWS).queryContractState(address);
  if (!state) return null;
  const l = ledger(state.data);
  return { doctors: l.doctorCount, reports: l.issued.size(), revoked: l.revoked.size() };
}
