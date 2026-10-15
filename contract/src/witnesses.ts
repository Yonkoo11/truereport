import type { Ledger } from '../managed/truereport/contract/index.js';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

/** Private state held only on the caller's device: their 32-byte secret key. */
export type TrueReportPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createTrueReportPrivateState = (secretKey: Uint8Array): TrueReportPrivateState => ({ secretKey });

export const witnesses = {
  secretKey: ({ privateState }: WitnessContext<Ledger, TrueReportPrivateState>): [TrueReportPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  doctorPath: ({ privateState, ledger }: WitnessContext<Ledger, TrueReportPrivateState>, leaf: Uint8Array) => {
    const path = ledger.doctors.findPathForLeaf(leaf);
    if (!path) throw new Error('This doctor key is not on the registry');
    return [privateState, path] as [TrueReportPrivateState, typeof path];
  },
};
