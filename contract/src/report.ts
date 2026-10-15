/**
 * The report format shared by the doctor's issue page, the verifier page and
 * the tests. Both sides must hash the same canonical text, so every field is
 * normalised the same way before hashing.
 */

export type ReportKind = 'sick-note' | 'fitness' | 'medical-report';

export type ReportFields = {
  readonly kind: ReportKind;
  readonly patientInitials: string;
  readonly issuedOn: string; // YYYY-MM-DD
  readonly validFrom: string; // YYYY-MM-DD or ''
  readonly validTo: string; // YYYY-MM-DD or ''
  readonly conclusion: string; // the line a verifier acts on, e.g. "Unfit for work"
  readonly doctorName: string;
  readonly doctorFolio: string; // MDCN registration number
};

/** What the QR carries. No diagnosis: the body text is only present as a salted hash. */
export type QrPayload = ReportFields & {
  readonly bodyHash: string; // hex
  readonly salt: string; // hex, 32 bytes
};

export const normalise = (s: string): string => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

const enc = new TextEncoder();

export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export const fromHex = (h: string): Uint8Array => {
  if (!/^([0-9a-f]{2})*$/i.test(h)) throw new Error('not hex');
  return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
};

export const sha256 = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));

export const newSalt = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

export const doctorIdOf = (doctorName: string, doctorFolio: string): Promise<Uint8Array> =>
  sha256(['truereport:doctor:v1', normalise(doctorName), normalise(doctorFolio)].join('\n'));

export const bodyHashOf = async (body: string, salt: Uint8Array): Promise<string> =>
  toHex(await sha256(['truereport:body:v1', toHex(salt), normalise(body)].join('\n')));

export const reportHashOf = (p: QrPayload): Promise<Uint8Array> =>
  sha256(
    [
      'truereport:report:v1',
      p.kind,
      normalise(p.patientInitials),
      p.issuedOn,
      p.validFrom,
      p.validTo,
      normalise(p.conclusion),
      normalise(p.doctorName),
      normalise(p.doctorFolio),
      p.bodyHash,
    ].join('\n'),
  );

const KINDS: readonly ReportKind[] = ['sick-note', 'fitness', 'medical-report'];
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;

/** Encode for the URL fragment (never sent to any server). */
export const encodeQr = (p: QrPayload): string => {
  const json = JSON.stringify([1, p.kind, p.patientInitials, p.issuedOn, p.validFrom, p.validTo, p.conclusion, p.doctorName, p.doctorFolio, p.bodyHash, p.salt]);
  return btoa(String.fromCharCode(...enc.encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Decode and validate a fragment. Throws on anything malformed. */
export const decodeQr = (s: string): QrPayload => {
  if (s.length > 4000) throw new Error('QR data too long');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const a: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(a) || a.length !== 11 || a[0] !== 1) throw new Error('Unknown QR format');
  if (!a.slice(1).every((x) => typeof x === 'string' && x.length <= 500)) throw new Error('Bad QR field');
  const [, kind, patientInitials, issuedOn, validFrom, validTo, conclusion, doctorName, doctorFolio, bodyHash, salt] = a as string[];
  if (!KINDS.includes(kind as ReportKind)) throw new Error('Unknown report type');
  if (![issuedOn, validFrom, validTo].every((d) => DATE.test(d)) || !issuedOn) throw new Error('Bad date');
  if (!/^[0-9a-f]{64}$/.test(bodyHash) || !/^[0-9a-f]{64}$/.test(salt)) throw new Error('Bad hash');
  return { kind: kind as ReportKind, patientInitials, issuedOn, validFrom, validTo, conclusion, doctorName, doctorFolio, bodyHash, salt };
};
