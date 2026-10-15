// Read the public ledger with no wallet: indexer only. This is the F-035 probe
// and the same query the verify page makes in the browser.
//   npm run read [-- <commitmentHex>]
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { resolveNetwork, getDeployment } from './network';
import { TrueReport } from './common';
import { toHex, fromHex } from '../../contract/src/report.ts';

const { network, config } = resolveNetwork();
const address = process.env.TRUEREPORT_ADDRESS ?? getDeployment(network)?.address;
if (!address) throw new Error(`No contract address for ${network}`);

const state = await indexerPublicDataProvider(config.indexer, config.indexerWS).queryContractState(address);
if (!state) throw new Error(`Indexer has no state for ${address}`);
const l = TrueReport.ledger(state.data);
console.log(`network=${network} address=${address}`);
console.log(`registrar=${toHex(l.registrar)} doctorCount=${l.doctorCount} issued=${l.issued.size()} revoked=${l.revoked.size()}`);
const c = process.argv.slice(2).find((a) => /^[0-9a-f]{64}$/i.test(a)); // skip --network flags
if (c) {
  const b = fromHex(c);
  console.log(`commitment ${c}: issued=${l.issued.member(b)} revoked=${l.revoked.member(b)}`);
}
process.exit(0);
