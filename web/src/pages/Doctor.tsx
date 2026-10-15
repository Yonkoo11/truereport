import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import {
  bodyHashOf, doctorIdOf, encodeQr, fromHex, newSalt, reportHashOf, toHex, type QrPayload, type ReportKind,
} from '../../../contract/src/report';
import { pureCircuits } from '../../../contract/managed/truereport/contract/index.js';
import Fields, { KIND_LABEL } from '../components/Fields';
import Proving from '../components/Proving';
import Stamp from '../components/Stamp';
import { VERIFY_BASE } from '../lib/config';
import { createKey, downloadBackup, loadKey, type DoctorKey } from '../lib/doctorKey';
import { openRegistry, plainError, type Registry } from '../lib/lace';
import { PAPER_FOOTER } from './Home';

export default function Doctor() {
  const [key, setKey] = useState<DoctorKey | null>(loadKey);
  return (
    <main className="read">
      <KeyStep doctor={key} onCreate={setKey} />
      {key && <CodeStep doctor={key} />}
      {key && <IssueStep doctor={key} />}
    </main>
  );
}

function KeyStep({ doctor, onCreate }: { doctor: DoctorKey | null; onCreate: (k: DoctorKey) => void }) {
  const [name, setName] = useState('');
  const [folio, setFolio] = useState('');
  return (
    <section className="stack">
      <h1 className="h2">1. Your doctor key</h1>
      {doctor ? (
        <>
          <dl className="fields">
            <div className="fields__row"><dt>Full name as registered</dt><dd>{doctor.name}</dd></div>
            <div className="fields__row"><dt>MDCN folio number</dt><dd className="num">{doctor.folio}</dd></div>
          </dl>
          <button className="btn btn--secondary" onClick={() => downloadBackup(doctor)}>Download key backup</button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onCreate(createKey(name, folio)); }}>
          <Field label="Full name as registered"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="MDCN folio number"><input className="input" value={folio} onChange={(e) => setFolio(e.target.value)} /></Field>
          <button className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }} disabled={name.trim().length < 2 || folio.trim().length < 2}>
            Create my doctor key
          </button>
        </form>
      )}
    </section>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="field"><span className="field__label">{label}</span>{children}</label>
);

function CodeStep({ doctor }: { doctor: DoctorKey }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    doctorIdOf(doctor.name, doctor.folio).then((id) => setCode(toHex(pureCircuits.doctorLeaf(pureCircuits.roleKey(fromHex(doctor.key)), id))));
  }, [doctor]);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <section className="section stack">
      <h2 className="h2">2. Your registry code</h2>
      <Stamp word="Registry code" tone="unknown" size="md" />
      <p className="mono-break num">{code || '…'}</p>
      <button className="btn btn--secondary" onClick={copy} disabled={!code}>{copied ? 'Copied' : 'Copy code'}</button>
      <p>Send this code to the TrueReport registrar. Once it is added, you can issue.</p>
    </section>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
type Issued = { payload: QrPayload; body: string; qr: string; commitment: Uint8Array };

function IssueStep({ doctor }: { doctor: DoctorKey }) {
  const [reg, setReg] = useState<Registry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await job();
    } catch (e) {
      setError(plainError(e));
    } finally {
      setBusy(false);
    }
  };
  const connect = () => run(async () => setReg(await openRegistry(`trueReportDoctor:${doctor.name}`, fromHex(doctor.key))));

  return (
    <section className="section stack">
      <h2 className="h2">3. Issue a report</h2>
      {!reg && (
        <>
          <button className="btn btn--primary" onClick={connect} disabled={busy}>Connect Lace</button>
          <p className="small">
            Issuing from this page needs the Midnight Lace wallet on Preview and has not yet been tested end to end. The demo reports were issued with
            the TrueReport command-line tool.
          </p>
        </>
      )}
      {reg && !issued && <IssueForm busy={busy} onIssue={(f, body) => run(async () => setIssued(await issue(reg, doctor, f, body)))} />}
      {issued && reg && <Sheet issued={issued} onRevoke={() => run(async () => { await reg.callTx.revokeReport(issued.commitment); })} busy={busy} />}
      {busy && <Proving />}
      {error && <p className="danger-text">{error}</p>}
    </section>
  );
}

type Form = { kind: ReportKind; patientInitials: string; issuedOn: string; validFrom: string; validTo: string; conclusion: string };

async function issue(reg: Registry, doctor: DoctorKey, f: Form, body: string): Promise<Issued> {
  const salt = newSalt();
  const payload: QrPayload = { ...f, doctorName: doctor.name, doctorFolio: doctor.folio, bodyHash: await bodyHashOf(body, salt), salt: toHex(salt) };
  const reportHash = await reportHashOf(payload);
  const doctorId = await doctorIdOf(doctor.name, doctor.folio);
  await reg.callTx.issueReport(reportHash, doctorId, salt);
  const qr = await QRCode.toDataURL(`${VERIFY_BASE}#${encodeQr(payload)}`, { margin: 1, width: 320 });
  return { payload, body, qr, commitment: pureCircuits.reportCommitment(reportHash, doctorId, salt) };
}

function IssueForm({ busy, onIssue }: { busy: boolean; onIssue: (f: Form, body: string) => void }) {
  const [f, setF] = useState<Form>({ kind: 'sick-note', patientInitials: '', issuedOn: today(), validFrom: today(), validTo: today(), conclusion: '' });
  const [body, setBody] = useState('');
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const ready = f.patientInitials.trim() && f.conclusion.trim() && body.trim();
  return (
    <form onSubmit={(e) => { e.preventDefault(); onIssue(f, body); }}>
      <Field label="Type">
        <select className="select" value={f.kind} onChange={set('kind')}>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <Field label="Patient initials"><input className="input" value={f.patientInitials} onChange={set('patientInitials')} /></Field>
      <div className="grid-2 field">
        <Field label="Issued on"><input className="input" type="date" value={f.issuedOn} onChange={set('issuedOn')} /></Field>
        <Field label="Valid from"><input className="input" type="date" value={f.validFrom} onChange={set('validFrom')} /></Field>
      </div>
      <Field label="Valid to"><input className="input" type="date" value={f.validTo} onChange={set('validTo')} /></Field>
      <Field label="Conclusion line"><input className="input" value={f.conclusion} onChange={set('conclusion')} /></Field>
      <Field label="Report body (not stored, not sent)">
        <textarea className="textarea textarea--tall" value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <button className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }} disabled={busy || !ready}>Issue on Midnight</button>
    </form>
  );
}

function Sheet({ issued, onRevoke, busy }: { issued: Issued; onRevoke: () => void; busy: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const revoke = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    onRevoke();
  };
  const { payload } = issued;
  return (
    <>
      <div className="sheet rows">
        <p className="h2">{payload.doctorName}</p>
        <p className="small">MDCN folio {payload.doctorFolio}</p>
        <Fields r={payload} />
        <p>{issued.body}</p>
        <img className="sheet__qr" src={issued.qr} alt="QR code to check this report" width={160} height={160} />
        <p className="small">{PAPER_FOOTER}</p>
      </div>
      <div className="btn-row">
        <button className="btn btn--primary" onClick={() => window.print()}>Print</button>
        <button className="btn btn--secondary btn--danger" onClick={revoke} disabled={busy}>{armed ? 'Press again to revoke' : 'Revoke this report'}</button>
      </div>
    </>
  );
}
