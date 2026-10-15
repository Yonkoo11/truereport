import { useEffect, useState } from 'react';
import Stamp from '../components/Stamp';
import { CONTRACT_ADDRESS, NETWORK } from '../lib/config';
import { shortAddr } from '../lib/format';
import { registryStats } from '../lib/verify';

const STEPS = [
  ['A registered doctor issues it', "The doctor's key is on the registry for their name and MDCN folio. Issuing records a fingerprint of the printed lines on Midnight."],
  ['The paper carries the code', 'The QR holds the printed lines and a salt. The diagnosis text stays on the paper and in the clinic.'],
  ['Anyone scans it', 'The phone reads the code, recomputes the fingerprint and asks the public registry. No wallet, no sign-up.'],
] as const;

export const PAPER_FOOTER = 'Check this report at truereport.vercel.app. Scan the code. TrueReport never asks for your name.';

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1 className="h1 h1--big">Check a Nigerian medical report in ten seconds.</h1>
          <p className="hero__body">
            Doctors issue sick notes, fitness certificates and medical reports with a QR code. Anyone can scan it to see if the paper is genuine and
            still valid. Nobody sees the diagnosis.
          </p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/verify">Check a report</a>
            <a className="btn btn--secondary" href="/doctor">I'm a doctor</a>
          </div>
        </div>
        <figure className="paper" style={{ margin: 0 }}>
          <span className="paper__stamp"><Stamp word="Registered" tone="ok" size="sm" /></span>
          <p className="small">Sick note · worked example</p>
          <img className="paper__qr" src="/anchor-qr.png" alt="QR code of the worked example sick note" width={160} height={160} />
          <p className="paper__name">Dr Demo Doctor</p>
          <p className="small">MDCN folio DEMO-0001</p>
          <p className="small paper__foot">{PAPER_FOOTER}</p>
        </figure>
      </section>
      <ol className="how">
        {STEPS.map(([head, body], i) => (
          <li key={head}>
            <span className="small">{i + 1}</span>
            <h2 className="h2">{head}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p className="small live num"><LiveLine /></p>
    </main>
  );
}

function LiveLine() {
  const [line, setLine] = useState(CONTRACT_ADDRESS ? 'Reading the registry…' : `Registry not yet deployed on ${NETWORK.label}.`);
  useEffect(() => {
    if (!CONTRACT_ADDRESS) return;
    registryStats(CONTRACT_ADDRESS).then(
      (s) => setLine(s ? `Contract ${shortAddr(CONTRACT_ADDRESS)} on ${NETWORK.label}, ${s.reports} reports issued.` : 'Could not reach the registry just now.'),
      () => setLine('Could not reach the registry just now.'),
    );
  }, []);
  return <>{line}</>;
}
