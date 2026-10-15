/**
 * Runs the real compiled TrueReport contract in memory (no network, no proofs),
 * so tests exercise the same circuit logic the chain enforces.
 */
import { type CircuitContext, QueryContext, sampleContractAddress, createConstructorContext, CostModel } from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger, pureCircuits } from '../managed/truereport/contract/index.js';
import { type TrueReportPrivateState, witnesses } from '../src/witnesses.js';

export class TrueReportSimulator {
  readonly contract = new Contract<TrueReportPrivateState>(witnesses);
  context: CircuitContext<TrueReportPrivateState>;

  constructor(registrarKey: Uint8Array) {
    const init = this.contract.initialState(createConstructorContext({ secretKey: registrarKey }, '0'.repeat(64)));
    this.context = {
      currentPrivateState: init.currentPrivateState,
      currentZswapLocalState: init.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(init.currentContractState.data, sampleContractAddress()),
    };
  }

  as(secretKey: Uint8Array): this {
    this.context = { ...this.context, currentPrivateState: { secretKey } };
    return this;
  }

  ledger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  addDoctor(leaf: Uint8Array): void {
    this.context = this.contract.impureCircuits.addDoctor(this.context, leaf).context;
  }

  removeDoctor(leaf: Uint8Array): void {
    this.context = this.contract.impureCircuits.removeDoctor(this.context, leaf).context;
  }

  issueReport(reportHash: Uint8Array, doctorId: Uint8Array, salt: Uint8Array): void {
    this.context = this.contract.impureCircuits.issueReport(this.context, reportHash, doctorId, salt).context;
  }

  revokeReport(commitment: Uint8Array): void {
    this.context = this.contract.impureCircuits.revokeReport(this.context, commitment).context;
  }
}

export const { roleKey, doctorLeaf, reportCommitment } = pureCircuits;
