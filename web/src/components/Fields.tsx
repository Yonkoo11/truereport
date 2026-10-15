import type { ReportFields } from '../../../contract/src/report';

export const KIND_LABEL = { 'sick-note': 'Sick note', fitness: 'Fitness certificate', 'medical-report': 'Medical report' } as const;

/** The printed lines a verifier compares with the paper. */
export default function Fields({ r }: { r: ReportFields }) {
  const rows: [string, string][] = [
    ['Type', KIND_LABEL[r.kind]],
    ['Patient initials', r.patientInitials],
    ['Issued on', r.issuedOn],
    ['Valid from', r.validFrom || '–'],
    ['Valid to', r.validTo || '–'],
    ['Conclusion', r.conclusion],
  ];
  return (
    <dl className="fields">
      {rows.map(([k, v]) => (
        <div className="fields__row" key={k}>
          <dt>{k}</dt>
          <dd className="num">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
