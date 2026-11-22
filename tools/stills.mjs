// node tools/stills.mjs outdir prefix 8:0.5 8:3 9:2 ...   (step is 1-based; renders with captions, prev-step crossfade)
import { chromium } from 'playwright';
import path from 'path'; import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out, prefix, ...specs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?render=1');
await page.waitForFunction(() => window.__anim); await page.evaluate(() => window.__anim.ready);
for (const sp of specs) {
  const [k, t] = sp.split(':').map(Number);
  const b64 = await page.evaluate(([k, t]) => { const S = window.__anim.steps(); window.__seek(k, t, window.__anim.gtBase(k) + t, k - 1, k > 0 ? S[k - 1].dur : 0); return document.getElementById('c').toDataURL('image/png').slice(22); }, [k - 1, t]);
  fs.writeFileSync(path.join(out, `${prefix}-s${k}-${t}.png`), Buffer.from(b64, 'base64'));
}
await browser.close();
