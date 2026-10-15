import { toHex } from '../../../contract/src/report';

export type DoctorKey = { name: string; folio: string; key: string };
const STORE = 'truereport.doctorKey.v1';

export function loadKey(): DoctorKey | null {
  try {
    const k = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    return k && typeof k.name === 'string' && typeof k.folio === 'string' && /^[0-9a-f]{64}$/.test(k.key) ? k : null;
  } catch {
    return null;
  }
}

export function createKey(name: string, folio: string): DoctorKey {
  const k = { name: name.trim(), folio: folio.trim(), key: toHex(crypto.getRandomValues(new Uint8Array(32))) };
  try {
    localStorage.setItem(STORE, JSON.stringify(k));
  } catch {
    /* storage blocked: the key lives for this tab only, and the backup download still works */
  }
  return k;
}

export function downloadBackup(k: DoctorKey) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(k, null, 2)], { type: 'application/json' }));
  a.download = 'truereport-doctor-key.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
