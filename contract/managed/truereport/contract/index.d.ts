import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  secretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  doctorPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
             leaf_0: Uint8Array): [PS, { leaf: Uint8Array,
                                         path: { sibling: { field: bigint },
                                                 goes_left: boolean
                                               }[]
                                       }];
}

export type ImpureCircuits<PS> = {
  addDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  removeDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueReport(context: __compactRuntime.CircuitContext<PS>,
              reportHash_0: Uint8Array,
              doctorId_0: Uint8Array,
              salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  addDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  removeDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueReport(context: __compactRuntime.CircuitContext<PS>,
              reportHash_0: Uint8Array,
              doctorId_0: Uint8Array,
              salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  roleKey(sk_0: Uint8Array): Uint8Array;
  doctorLeaf(pk_0: Uint8Array, doctorId_0: Uint8Array): Uint8Array;
  reportCommitment(reportHash_0: Uint8Array,
                   doctorId_0: Uint8Array,
                   salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  roleKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  doctorLeaf(context: __compactRuntime.CircuitContext<PS>,
             pk_0: Uint8Array,
             doctorId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  reportCommitment(context: __compactRuntime.CircuitContext<PS>,
                   reportHash_0: Uint8Array,
                   doctorId_0: Uint8Array,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  addDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  removeDoctor(context: __compactRuntime.CircuitContext<PS>, leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueReport(context: __compactRuntime.CircuitContext<PS>,
              reportHash_0: Uint8Array,
              doctorId_0: Uint8Array,
              salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeReport(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly registrar: Uint8Array;
  doctors: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined
  };
  doctorSlot: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly doctorCount: bigint;
  issued: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  revoked: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
