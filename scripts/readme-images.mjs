// Builds the README pictures from real captures of the running site.
// Usage: node scripts/readme-images.mjs [site-url]   (default http://127.0.0.1:5173)
// The site must point at a registry that holds the example reports (see README).
// PLAYWRIGHT=/path/to/playwright-core/index.mjs overrides the import.
import { mkdirSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright-core');
const site = process.argv[2] ?? 'http://127.0.0.1:5173';
const out = 'assets/readme';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

async function capture(width, height, go) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await go(page);
  await page.waitForTimeout(1200); // let the stamp animation finish
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return png;
}

// One frame for every picture: grey-50 card, 12px radius, one shadow, transparent corners.
async function frame(png, file, width) {
  const page = await browser.newPage({ viewport: { width: width + 96, height: 400 }, deviceScaleFactor: 2 });
  const src = `data:image/png;base64,${png.toString('base64')}`;
  await page.setContent(`<body style="margin:0;background:transparent">
    <div id="card" style="display:inline-block;padding:48px">
      <img src="${src}" style="display:block;width:${width}px;border-radius:12px;border:1px solid #e3e6ea;
        box-shadow:0 1px 2px rgba(17,20,24,.06),0 8px 24px rgba(17,20,24,.08)">
    </div></body>`);
  await page.locator('#card').screenshot({ path: `${out}/${file}`, omitBackground: true });
  await page.close();
}

async function example(label) {
  return capture(390, 844, async (page) => {
    await page.goto(site);
    await page.click(`.examples a:text-is("${label}")`);
    await page.waitForSelector('.stamp', { timeout: 30000 });
  });
}

await frame(await capture(1440, 900, (p) => p.goto(site)), 'home.png', 1440);
await frame(await example('Genuine'), 'genuine.png', 390);
await frame(await example('Revoked'), 'revoked.png', 390);
await frame(await example('Altered'), 'altered.png', 390);
await browser.close();
console.log(`wrote 4 pictures to ${out}/`);
