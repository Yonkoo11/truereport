// Operator role keys (registrar, demo doctors). 32 random bytes each, kept in
// .operator/ with owner-only permissions; gitignored. Never printed.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';

const DIR = path.resolve(process.cwd(), '.operator');

export function loadOrCreateKey(name: string): Uint8Array {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`bad key name: ${name}`);
  const file = path.join(DIR, `${name}.key`);
  if (fs.existsSync(file)) {
    const hex = fs.readFileSync(file, 'utf-8').trim();
    if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error(`${file} is not a 32-byte hex key`);
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  }
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const key = randomBytes(32);
  fs.writeFileSync(file, key.toString('hex') + '\n', { mode: 0o600 });
  return new Uint8Array(key);
}
