import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as TrueReport from '../managed/truereport/contract/index.js';
export { witnesses, createTrueReportPrivateState } from './witnesses.js';
export type { TrueReportPrivateState } from './witnesses.js';
export * from './report.js';

import * as TrueReportContract from '../managed/truereport/contract/index.js';
import { witnesses } from './witnesses.js';

export const CompiledTrueReportContract = CompiledContract.make('truereport', TrueReportContract.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./managed/truereport'),
);
