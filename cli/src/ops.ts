// Operator actions against the deployed contract, one wallet session each:
//   npm run ops -- add-doctor "<name>" "<MDCN folio>" [keyName]
//   npm run ops -- issue-demo [keyName]      issues a demo sick note, prints its verify link
//   npm run ops -- revoke <commitmentHex> [keyName]
// keyName picks a doctor key in .operator/ (default "doctor-demo").
import * as fs from 'node:fs';
import * as path from 'node:path';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { resolveNetwork, getOrCreateWallet, getDeployment } from './network';
import { persistWalletState } from './wallet';
import { readyWallet } from './ready-wallet';
import { compiledContract, createProviders, waitForProofServer, TrueReport } from './common';
import { loadOrCreateKey } from './keys';
import { PRIVATE_STATE_ID as REGISTRAR_STATE_ID } from './ids';
import { doctorIdOf, reportHashOf, bodyHashOf, newSalt, toHex, fromHex, encodeQr, type QrPayload } from '../../contract/src/report.ts';

const VERIFY_BASE = process.env.TRUEREPORT_VERIFY_URL ?? 'https://truereport.vercel.app/verify';
const { roleKey, doctorLeaf, reportCommitment } = TrueReport.pureCircuits;

// --network <id> may appear anywhere; resolveNetwork reads it, positional args skip it.
const argv = process.argv.slice(2).filter((a, i, all) => a !== '--network' && all[i - 1] !== '--network' && !a.startsWith('--network='));
const [cmd, ...args] = argv;
const { network, config: networkConfig } = resolveNetwork();
const deployment = getDeployment(network);
if (!deployment) throw new Error(`No deployment recorded for ${network}. Run npm run deploy first.`);

async function connect(stateId: string, secretKey: Uint8Array) {
  const { walletCtx } = await readyWallet(network, networkConfig, getOrCreateWallet(network).seed);
  if (!(await waitForProofServer(networkConfig))) throw new Error('Proof server not responding on :6300');
  const providers = await createProviders(walletCtx, networkConfig);
  const contract = await findDeployedContract(providers as any, {
    compiledContract: compiledContract as any,
    contractAddress: deployment!.address,
    privateStateId: stateId,
    initialPrivateState: { secretKey },
  });
  return { walletCtx, contract: contract as any };
}

function logTx(label: string, tx: any) {
  const line = `${new Date().toISOString()} ${network} ${label} txId=${tx.public.txId} block=${tx.public.blockHeight}`;
  console.log(`  ✅ ${line}`);
  fs.appendFileSync(path.resolve(process.cwd(), 'tx-log.txt'), line + '\n');
}

async function main() {
  if (cmd === 'add-doctor') {
    const [name, folio, keyName = 'doctor-demo'] = args;
    if (!name || !folio) throw new Error('usage: add-doctor "<name>" "<folio>" [keyName]');
    const doctorKey = loadOrCreateKey(keyName);
    fs.writeFileSync(path.resolve(process.cwd(), '.operator', `${keyName}.json`), JSON.stringify({ name, folio }) + '\n', { mode: 0o600 });
    const leaf = doctorLeaf(roleKey(doctorKey), await doctorIdOf(name, folio));
    const { walletCtx, contract } = await connect(REGISTRAR_STATE_ID, loadOrCreateKey('registrar'));
    logTx(`addDoctor leaf=${toHex(leaf)}`, await contract.callTx.addDoctor(leaf));
    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } else if (cmd === 'issue-demo') {
    const [keyName = 'doctor-demo'] = args;
    const doc = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.operator', `${keyName}.json`), 'utf-8'));
    const salt = newSalt();
    const today = new Date().toISOString().slice(0, 10);
    const payload: QrPayload = {
      kind: 'sick-note',
      patientInitials: 'A.O.',
      issuedOn: today,
      validFrom: today,
      validTo: today,
      conclusion: 'Unfit for work for 1 day',
      doctorName: doc.name,
      doctorFolio: doc.folio,
      bodyHash: await bodyHashOf('Demo report body. Seen in clinic; rest advised.', salt),
      salt: toHex(salt),
    };
    const doctorId = await doctorIdOf(doc.name, doc.folio);
    const reportHash = await reportHashOf(payload);
    const c = reportCommitment(reportHash, doctorId, salt);
    const { walletCtx, contract } = await connect(`trueReportDoctor:${keyName}`, loadOrCreateKey(keyName));
    logTx(`issueReport commitment=${toHex(c)}`, await contract.callTx.issueReport(reportHash, doctorId, salt));
    console.log(`  Verify link: ${VERIFY_BASE}#${encodeQr(payload)}`);
    fs.appendFileSync(path.resolve(process.cwd(), 'demo-links.txt'), `${toHex(c)} ${VERIFY_BASE}#${encodeQr(payload)}\n`);
    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } else if (cmd === 'revoke') {
    const [hex, keyName = 'doctor-demo'] = args;
    if (!/^[0-9a-f]{64}$/.test(hex ?? '')) throw new Error('usage: revoke <64-hex commitment> [keyName]');
    const { walletCtx, contract } = await connect(`trueReportDoctor:${keyName}`, loadOrCreateKey(keyName));
    logTx(`revokeReport commitment=${hex}`, await contract.callTx.revokeReport(fromHex(hex)));
    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } else {
    throw new Error('commands: add-doctor | issue-demo | revoke');
  }
}

main().then(() => process.exit(0), (err) => {
  console.error(`\n  ❌ ${err?.message ?? err}`);
  for (let c = err?.cause; c; c = c.cause) console.error(`     cause: ${c?.message ?? c}`);
  process.exit(1);
});
