import { useState } from 'react';
import { fromHex } from '../../../contract/src/report';
import Proving from '../components/Proving';
import { openRegistry, plainError } from '../lib/lace';

const HEX64 = /^[0-9a-f]{64}$/i;

export default function Registrar() {
  const [key, setKey] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<string[]>([]);

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      if (!HEX64.test(key.trim())) throw new Error('The registrar key is 64 hex characters.');
      const reg = await openRegistry('trueReportRegistrar', fromHex(key.trim()));
      const tx = await reg.callTx.addDoctor(fromHex(code.trim()));
      setRows((r) => [`Added. Transaction ${tx.public.txId} in block ${tx.public.blockHeight}.`, ...r]);
      setCode('');
    } catch (e) {
      setError(plainError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="read stack">
      <h1 className="h1">Registrar</h1>
      <form onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="field">
          <span className="field__label">Registrar key</span>
          <input className="input" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Registry code</span>
          <input className="input num" placeholder="Paste a doctor's registry code." value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }} disabled={busy || !HEX64.test(code.trim())}>Add doctor</button>
      </form>
      {busy && <Proving />}
      {error && <p className="danger-text">{error}</p>}
      {rows.length > 0 && <ul className="rows">{rows.map((r) => <li key={r} className="mono-break">{r}</li>)}</ul>}
    </main>
  );
}
