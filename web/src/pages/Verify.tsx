import { useEffect, useRef, useState } from 'react';
import type { QrPayload } from '../../../contract/src/report';
import { decodeQr, encodeQr } from '../../../contract/src/report';
import Fields from '../components/Fields';
import Stamp from '../components/Stamp';
import Steps from '../components/Steps';
import { CONTRACT_ADDRESS, EXAMPLE_GENUINE, EXAMPLE_REVOKED, NETWORK } from '../lib/config';
import { shortAddr } from '../lib/format';
import { bodyMatches, check, SLOW_MS, type CheckResult, type Step } from '../lib/verify';

const STEP_LABELS = ["Reading the paper's code", 'Computing its fingerprint', 'Asking the Midnight registry'] as const;
const STEP_INDEX: Record<Step, number> = { read: 1, hash: 2, ask: 3 };

const VERDICT = {
  genuine: {
    word: 'Genuine',
    tone: 'ok',
    sub: 'Issued by a doctor on the TrueReport registry and not revoked.',
    proves:
      'The printed lines below came, unaltered, from a doctor key on the registry for that name and folio, and the doctor has not withdrawn the report. It does not prove the medical opinion is correct.',
  },
  revoked: {
    word: 'Revoked',
    tone: 'danger',
    sub: 'The issuing doctor withdrew this report. Do not accept it.',
    proves: 'A registered doctor issued these lines, then withdrew them. The paper no longer counts as valid.',
  },
  notfound: {
    word: 'Not on the registry',
    tone: 'danger',
    sub: 'No registered doctor issued a report matching this paper. It may have been altered, or the code was copied from a different paper.',
    proves: 'No doctor on the registry issued a report with these lines. The name and folio in the code are not confirmed.',
  },
  invalid: {
    word: 'Not valid',
    tone: 'unknown',
    sub: 'This code is not a TrueReport code, or it was damaged. Do not accept this paper on the strength of this code.',
    proves: 'Nothing. The code could not be read, so the registry was not asked.',
  },
} as const;

type State = { kind: 'loading'; done: number; slow: boolean } | { kind: 'error' } | { kind: 'result'; r: CheckResult };

const Privacy = () => <p className="small foot">TrueReport never asks for your name, phone number or any ID.</p>;

export default function Verify() {
  // Same-page example clicks only change the hash, so listen for it:
  // without this the example links on the empty page do nothing.
  const [fragment, setFragment] = useState(() => location.hash.slice(1));
  useEffect(() => {
    const onHash = () => setFragment(location.hash.slice(1));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  if (!CONTRACT_ADDRESS) {
    return (
      <main className="read">
        <h1 className="h1">The registry is not on Midnight Preview yet</h1>
        <p className="lead">This page cannot check reports until the TrueReport registry is deployed. Nothing is wrong with the paper.</p>
        <Privacy />
      </main>
    );
  }
  if (!fragment) {
    return (
      <main className="read">
        <h1 className="h1 h1--big">Scan the QR on the report</h1>
        <p className="lead">Point your phone camera at the square code on the paper. This page opens with the result.</p>
        <Examples />
        <Privacy />
      </main>
    );
  }
  return <Checking fragment={fragment} />;
}

/** The genuine example with its conclusion changed, so the registry has no match. */
const altered = (fragment: string): string => encodeQr({ ...decodeQr(fragment), conclusion: 'Unfit for work for 14 days' });

function Examples() {
  if (!CONTRACT_ADDRESS || !EXAMPLE_GENUINE || !EXAMPLE_REVOKED) return null;
  const links: [string, string][] = [
    ['Genuine', EXAMPLE_GENUINE],
    ['Revoked', EXAMPLE_REVOKED],
    ['Altered', altered(EXAMPLE_GENUINE)],
  ];
  return (
    <p className="small examples">
      No paper to hand? Try an example:{' '}
      {links.map(([label, f], i) => (
        <span key={label}>
          {i > 0 && ' · '}
          <a href={`/verify#${f}`}>{label}</a>
        </span>
      ))}
    </p>
  );
}

function Checking({ fragment }: { fragment: string }) {  const [state, setState] = useState<State>({ kind: 'loading', done: 0, slow: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading', done: 0, slow: false });
    const slow = setTimeout(() => live && setState((s) => (s.kind === 'loading' ? { ...s, slow: true } : s)), SLOW_MS);
    const onStep = (s: Step) => live && setState((st) => (st.kind === 'loading' ? { ...st, done: STEP_INDEX[s] } : st));
    check(fragment, CONTRACT_ADDRESS, onStep).then(
      (r) => live && setState({ kind: 'result', r }),
      () => live && setState({ kind: 'error' }),
    );
    return () => {
      live = false;
      clearTimeout(slow);
    };
  }, [fragment, attempt]);

  if (state.kind === 'loading') {
    return (
      <main className="read stack" aria-live="polite">
        <h1 className="h2">Checking the public registry…</h1>
        <Steps labels={STEP_LABELS} done={state.done} />
        {state.slow && <p className="small">The network is slow. Still trying.</p>}
      </main>
    );
  }
  if (state.kind === 'error') {
    return (
      <main className="read stack">
        <p>Could not reach the registry. Nothing is wrong with the paper yet; we just could not check it.</p>
        <button className="btn btn--primary" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        <Privacy />
      </main>
    );
  }
  return <Result r={state.r} />;
}

function Result({ r }: { r: CheckResult }) {
  const v = VERDICT[r.verdict];
  return (
    <main className="read">
      <Stamp word={v.word} tone={v.tone} size="lg" />
      <p className="lead">{v.sub}</p>
      {r.verdict !== 'invalid' && (
        <p className="small num" style={{ marginTop: 'var(--space-2)' }}>
          Read from registry contract {shortAddr(CONTRACT_ADDRESS)} on {NETWORK.label}
          {r.block !== null && <> at block {r.block}</>}.
        </p>
      )}
      {r.verdict === 'genuine' && <Issued p={r.payload} />}
      <section className="section proves">
        <h2 className="h2">What this proves</h2>
        <p>{v.proves}</p>
      </section>
      {r.verdict === 'genuine' && <BodyCheck p={r.payload} />}
      {(r.verdict === 'revoked' || r.verdict === 'notfound') && (
        <details className="section">
          <summary className="h2">{r.verdict === 'revoked' ? 'What was issued, then withdrawn' : 'What the code claims (not confirmed)'}</summary>
          <p className="small" style={{ marginTop: 'var(--space-4)' }}>{r.payload.doctorName}, MDCN folio {r.payload.doctorFolio}</p>
          <Fields r={r.payload} />
        </details>
      )}
      <div className="section">
        <a className="btn btn--secondary" href="/verify">Check another report</a>
      </div>
      <Privacy />
    </main>
  );
}

function Issued({ p }: { p: QrPayload }) {
  return (
    <>
      <div className="section">
        <p className="h2">{p.doctorName}</p>
        <p className="small">MDCN folio {p.doctorFolio}</p>
      </div>
      <section className="section stack">
        <h2 className="h2">Compare each line with the paper in your hand</h2>
        <Fields r={p} />
      </section>
    </>
  );
}

function BodyCheck({ p }: { p: QrPayload }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const run = async () => setResult(await bodyMatches(text, p));
  return (
    <details className="section stack">
      <summary className="h2">Check the body text too</summary>
      <p className="small">Type the report text exactly as printed. It stays on this phone.</p>
      <textarea
        ref={area}
        className="textarea"
        aria-label="Report body text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
      />
      <button className="btn btn--secondary" onClick={run} disabled={!text.trim()}>Check body text</button>
      {result === true && <p className="ok-text">Body text matches.</p>}
      {result === false && <p className="danger-text">Body text does not match what the doctor issued.</p>}
    </details>
  );
}
