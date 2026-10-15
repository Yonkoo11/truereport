// Print the operator wallet's public address (no secrets) so it can be funded before sync ends.
import { Buffer } from 'buffer';
import { HDWallet, Roles, createKeystore } from '@midnight-ntwrk/wallet-sdk';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { resolveNetwork, getOrCreateWallet } from './network';

const { network, config } = resolveNetwork();
setNetworkId(config.networkId);
const hd = HDWallet.fromSeed(Buffer.from(getOrCreateWallet(network).seed, 'hex'));
if (hd.type !== 'seedOk') throw new Error('Invalid seed');
const r = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0);
if (r.type !== 'keysDerived') throw new Error('Key derivation failed');
console.log(createKeystore(r.keys[Roles.NightExternal], config.networkId).getBech32Address().toString());
