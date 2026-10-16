import { useEffect, useState } from 'react';
import Stamp from '../components/Stamp';
import { decodeQr, encodeQr } from '../../../contract/src/report';
import { CONTRACT_ADDRESS, EXAMPLE_GENUINE, EXAMPLE_REVOKED, NETWORK } from '../lib/config';
import { shortAddr } from '../lib/format';
import { registryStats } from '../lib/verify';

const VERDICTS = [
  ['Genuine', 'ok', 'The printed lines came, unaltered, from a doctor key on the registry, and the report was not withdrawn.'],
  ['Revoked', 'danger', 'The issuing doctor withdrew this report. Do not accept it.'],
  ['Not on the registry', 'danger', 'No registered doctor issued a report matching this paper. It may have been altered.'],
] as const;

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
            Doctors can issue sick notes, fitness certificates and medical reports with a QR code. Anyone can scan it to see if the paper is genuine and
            still valid. Nobody sees the diagnosis.
          </p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/verify">Check a report</a>
            <a className="btn btn--secondary" href="/doctor">I'm a doctor</a>
          </div>
          <Examples />
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
      <ol className="verdicts">
        {VERDICTS.map(([word, tone, line]) => (
          <li key={word}>
            <Stamp word={word} tone={tone as 'ok' | 'danger'} size="sm" />
            <p>{line}</p>
          </li>
        ))}
      </ol>
      <ol className="how">
        {STEPS.map(([head, body], i) => (
          <li key={head}>
            <h2 className="h2"><span className="how__n">{i + 1}</span>{head}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p className="small live num"><LiveLine /></p>
      <section className="proves limits">
        <h2 className="h2">What this proves</h2>
        <p>The printed lines above came, unaltered, from a doctor key on the registry for that name and folio, and the doctor has not withdrawn the report. It does not prove the medical opinion is correct.</p>
      </section>
      <section className="close">
        <h2 className="h1">Check a Nigerian medical report in ten seconds.</h2>
        <div className="btn-row">
          <a className="btn btn--primary" href="/verify">Check a report</a>
          <a className="btn btn--secondary" href="/doctor">I'm a doctor</a>
        </div>
      </section>
    </main>
  );
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
