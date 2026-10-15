import { describe, it, expect, beforeEach } from 'vitest';
import { TrueReportSimulator, roleKey, doctorLeaf, reportCommitment } from './simulator.js';
import { bodyHashOf, decodeQr, doctorIdOf, encodeQr, fromHex, newSalt, reportHashOf, toHex, type QrPayload } from '../src/report.js';

const key = (n: number) => new Uint8Array(32).fill(n);
const REGISTRAR = key(1);
const DR_ADA = key(2);
const DR_BAYO = key(3);
const STRANGER = key(9);

const fields = {
  kind: 'sick-note' as const,
  patientInitials: 'O.A.',
  issuedOn: '2026-10-14',
  validFrom: '2026-10-14',
  validTo: '2026-10-18',
  conclusion: 'Unfit for work',
  doctorName: 'Dr Ada Okafor',
  doctorFolio: 'MDCN/R/123456',
};

const makeReport = async (overrides: Partial<QrPayload> = {}) => {
  const salt = newSalt();
  const payload: QrPayload = { ...fields, bodyHash: await bodyHashOf('Acute malaria. Rest and artemether-lumefantrine.', salt), salt: toHex(salt), ...overrides };
  const reportHash = await reportHashOf(payload);
  const doctorId = await doctorIdOf(payload.doctorName, payload.doctorFolio);
  return { payload, reportHash, doctorId, salt: fromHex(payload.salt), commitment: reportCommitment(reportHash, doctorId, fromHex(payload.salt)) };
};

const has = (set: { member(x: Uint8Array): boolean }, x: Uint8Array) => set.member(x);

describe('registry', () => {
  let sim: TrueReportSimulator;
  beforeEach(() => {
    sim = new TrueReportSimulator(REGISTRAR);
  });

  it('stores only a hash of the registrar key', () => {
    expect(sim.ledger().registrar).toEqual(roleKey(REGISTRAR));
  });

  it('registrar adds a doctor', async () => {
    const leaf = doctorLeaf(roleKey(DR_ADA), await doctorIdOf(fields.doctorName, fields.doctorFolio));
    sim.addDoctor(leaf);
    expect(sim.ledger().doctorSlot.member(leaf)).toBe(true);
    expect(sim.ledger().doctorCount).toBe(1n);
  });

  it('refuses a doctor added by anyone but the registrar', async () => {
    const leaf = doctorLeaf(roleKey(STRANGER), await doctorIdOf('Dr Fake', 'MDCN/R/000000'));
    expect(() => sim.as(STRANGER).addDoctor(leaf)).toThrow(/only the registrar/);
  });

  it('refuses adding the same doctor twice', async () => {
    const leaf = doctorLeaf(roleKey(DR_ADA), await doctorIdOf(fields.doctorName, fields.doctorFolio));
    sim.addDoctor(leaf);
    expect(() => sim.addDoctor(leaf)).toThrow(/already registered/);
  });

  it('refuses removal by anyone but the registrar', async () => {
    const leaf = doctorLeaf(roleKey(DR_ADA), await doctorIdOf(fields.doctorName, fields.doctorFolio));
    sim.addDoctor(leaf);
    expect(() => sim.as(DR_ADA).removeDoctor(leaf)).toThrow(/only the registrar/);
  });
});

describe('issue and revoke', () => {
  let sim: TrueReportSimulator;
  beforeEach(async () => {
    sim = new TrueReportSimulator(REGISTRAR);
    sim.addDoctor(doctorLeaf(roleKey(DR_ADA), await doctorIdOf(fields.doctorName, fields.doctorFolio)));
    sim.addDoctor(doctorLeaf(roleKey(DR_BAYO), await doctorIdOf('Dr Bayo Lawal', 'MDCN/R/654321')));
  });

  it('a registered doctor issues; the ledger holds the commitment and nothing readable', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    const l = sim.ledger();
    expect(has(l.issued, r.commitment)).toBe(true);
    expect(has(l.revoked, r.commitment)).toBe(false);
    expect(l.issued.size()).toBe(1n);
    // the stored value is the revoke tag, not the report hash or doctor id
    const tag = l.issued.lookup(r.commitment);
    expect(toHex(tag)).not.toBe(toHex(r.reportHash));
    expect(toHex(tag)).not.toBe(toHex(r.doctorId));
  });

  it('refuses a doctor who is not on the registry', async () => {
    const r = await makeReport();
    expect(() => sim.as(STRANGER).issueReport(r.reportHash, r.doctorId, r.salt)).toThrow(/not on the registry/);
  });

  it('refuses a registered doctor claiming another doctor\'s name and folio', async () => {
    const r = await makeReport(); // payload names Dr Ada
    expect(() => sim.as(DR_BAYO).issueReport(r.reportHash, r.doctorId, r.salt)).toThrow(/not on the registry/);
  });

  it('refuses a doctor after the registrar removes them', async () => {
    const leaf = doctorLeaf(roleKey(DR_ADA), await doctorIdOf(fields.doctorName, fields.doctorFolio));
    sim.as(REGISTRAR).removeDoctor(leaf);
    const r = await makeReport();
    expect(() => sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt)).toThrow(/not on the registry|not a registered doctor/);
  });

  it('refuses issuing the same report twice', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    expect(() => sim.issueReport(r.reportHash, r.doctorId, r.salt)).toThrow(/already issued/);
  });

  it('the issuing doctor revokes; the report shows as revoked', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    sim.revokeReport(r.commitment);
    expect(has(sim.ledger().revoked, r.commitment)).toBe(true);
  });

  it('refuses revoke by another registered doctor', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    expect(() => sim.as(DR_BAYO).revokeReport(r.commitment)).toThrow(/only the issuing doctor/);
  });

  it('refuses revoke by the registrar', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    expect(() => sim.as(REGISTRAR).revokeReport(r.commitment)).toThrow(/only the issuing doctor/);
  });

  it('refuses revoking a report that was never issued, or twice', async () => {
    const r = await makeReport();
    expect(() => sim.as(DR_ADA).revokeReport(r.commitment)).toThrow(/not issued/);
    sim.issueReport(r.reportHash, r.doctorId, r.salt);
    sim.revokeReport(r.commitment);
    expect(() => sim.revokeReport(r.commitment)).toThrow(/already revoked/);
  });

  it('an altered paper does not match: changing the dates gives a commitment the ledger never saw', async () => {
    const r = await makeReport();
    sim.as(DR_ADA).issueReport(r.reportHash, r.doctorId, r.salt);
    const forged = { ...r.payload, validTo: '2026-10-28' };
    const c2 = reportCommitment(await reportHashOf(forged), r.doctorId, r.salt);
    expect(has(sim.ledger().issued, c2)).toBe(false);
  });

  it('the same report text with a different salt gives an unrelated commitment (no guessing)', async () => {
    const a = await makeReport();
    const c2 = reportCommitment(a.reportHash, a.doctorId, newSalt());
    expect(toHex(c2)).not.toBe(toHex(a.commitment));
  });
});

describe('QR payload', () => {
  it('round-trips and recomputes the same commitment', async () => {
    const r = await makeReport();
    const back = decodeQr(encodeQr(r.payload));
    expect(back).toEqual(r.payload);
    const c = reportCommitment(await reportHashOf(back), await doctorIdOf(back.doctorName, back.doctorFolio), fromHex(back.salt));
    expect(c).toEqual(r.commitment);
  });

  it('carries no diagnosis text', async () => {
    const r = await makeReport();
    expect(atob(encodeQr(r.payload).replace(/-/g, '+').replace(/_/g, '/'))).not.toMatch(/malaria/i);
  });

  it('normalises spacing and case so a retyped name still matches', async () => {
    expect(await doctorIdOf('  dr ADA   okafor ', 'mdcn/r/123456')).toEqual(await doctorIdOf('Dr Ada Okafor', 'MDCN/R/123456'));
  });

  it('rejects malformed or hostile input', () => {
    expect(() => decodeQr('not-base64!!')).toThrow();
    expect(() => decodeQr(btoa('[2,"x"]'))).toThrow(/Unknown QR format/);
    expect(() => decodeQr(btoa(JSON.stringify([1, 'virus', '', '2026-01-01', '', '', '', '', '', 'a'.repeat(64), 'b'.repeat(64)])))).toThrow(/report type/);
    expect(() => decodeQr(btoa(JSON.stringify([1, 'sick-note', '', '2026-01-01', '', '', '', '', '', 'zz', 'b'.repeat(64)])))).toThrow(/Bad hash/);
    expect(() => decodeQr(btoa(JSON.stringify([1, 'sick-note', '', '<script>', '', '', '', '', '', 'a'.repeat(64), 'b'.repeat(64)])))).toThrow(/Bad date/);
    expect(() => decodeQr('A'.repeat(5000))).toThrow(/too long/);
  });

  it('a body check fails when the diagnosis text was altered', async () => {
    const r = await makeReport();
    expect(await bodyHashOf('Acute malaria. Rest and artemether-lumefantrine.', r.salt)).toBe(r.payload.bodyHash);
    expect(await bodyHashOf('Fit for duty.', r.salt)).not.toBe(r.payload.bodyHash);
  });
});
