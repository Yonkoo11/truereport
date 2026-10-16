// Checks the live verify page against Preview: asserts Genuine / Revoked /
// Not-on-registry verdicts in a real browser with zero console errors.
// Usage: node scripts/preview-check.mjs [site-url]
import { readFileSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright-core');
const site = process.argv[2] ?? 'https://truereport.vercel.app';
const frags = readFileSync('/tmp/frags.txt', 'utf-8').trim().split('\n');
const [genuine, revoked] = frags;

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

async function verdict(frag) {
  // Force a fresh document each time: same-URL hash changes alone don't reload,
  // and the verify effect only runs on mount.
  await page.goto('about:blank');
  await page.goto(`${site}/verify?t=${Date.now()}#${frag}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // indexer round-trip + stamp animation
  const body = await page.textContent('main');
  for (const v of ['Genuine', 'Revoked', 'Not on the registry', 'Not valid', 'Could not reach']) {
    if (body.includes(v)) return v;
  }
  return `UNKNOWN: ${body.slice(0, 120)}`;
}

const g = await verdict(genuine);
const r = await verdict(revoked);
// Altered: same as genuine with one word changed in the conclusion
const altered = genuine.slice(0, -20) + 'X'.repeat(20);
const a = await verdict(altered);
console.log(`genuine=${g} revoked=${r} altered=${a} console-errors=${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(e);
await browser.close();
process.exit(g === 'Genuine' && r === 'Revoked' && a !== 'Genuine' && errors.length === 0 ? 0 : 1);
