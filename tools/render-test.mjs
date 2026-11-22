// Test render of a run of steps as ONE clip, cropped to the scene band, no captions.
//   node render-test.mjs --steps 3-4 --name scene2 [--scale 2] [--theme dark|light] [--out out/clips] [--no-footer] [--band]
//   --steps A-B  1-based steps, stitched into ONE mp4 (A-A = a single step)   --scale N  1 = 1920x1080, 2 = 3840x2160   --no-footer  hides the citation line
//   --still K:T  one PNG of step K at T seconds instead of a video   --band  the old 800 px band crop (default is the full 1920x1080 frame)
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs'; import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-look.mjs')], { stdio: 'inherit' });      // the project look (look/LOOK.md) into js/look.js first
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const [a, b] = arg('steps', '3-4').split('-').map(Number), fade = arg('fade', null), theme = arg('theme', 'dark'), fps = Number(arg('fps', 30)), scale = Number(arg('scale', 1)), full = !process.argv.includes('--band'), still = arg('still', null);
const name = arg('name', `steps-${a}-${b}`), OUT = path.resolve(ROOT, arg('out', path.join('out', 'tests'))); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + `?render=1&scale=${scale}${fade ? '&fade=' + fade : ''}${process.argv.includes('--no-footer') ? '&captions=0' : ''}${full ? '' : '&full=0'}${arg('qs', '') ? '&' + arg('qs', '') : ''}`);      // --qs "abo=2": extra URL flags
await page.waitForFunction(() => window.__anim); await page.evaluate(() => window.__anim.ready);
await page.evaluate(m => window.__anim.setTheme(m), theme);
const steps = await page.evaluate(() => window.__anim.steps());
const crop = full ? { y: 0, h: 1080 } : await page.evaluate(() => window.__anim.crop);
if (still) {      // --still <step>:<t>  -> one PNG
  const [sk, st] = still.split(':').map(Number);
  const b64 = await page.evaluate(([k, t, sc]) => { window.__seek(k, t, window.__anim.gtBase(k) + t, k, 0); const c = document.getElementById('c'); return c.toDataURL('image/png').slice(22); }, [sk - 1, st, scale]);
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(b64, 'base64')); await browser.close(); process.exit(0);
}
// PowerPoint-friendly H.264: High profile, 8-bit 4:2:0, constant frame rate, BT.709 tagged (and converted with that matrix, so colours match the
// canvas), a keyframe every second, moov atom up front, no audio track.
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', scale > 1.2 ? '5.1' : '4.0', '-crf', '18', '-preset', 'medium', '-g', String(fps), '-bf', '2',
  // transfer tagged sRGB (iec61966-2-1), not BT.709: macOS (PowerPoint, QuickTime) plays a BT.709-tagged clip ~12-15% darker
  // than the same picture shown as a still, so the slide's poster frame flashed brighter for ~0.1 s as playback took over.
  // Tagged sRGB, video and still are shown identically (and at the designed colours). Windows ignores the tag either way.
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
  '-an', '-r', String(fps), '-movflags', '+faststart+write_colr', path.join(OUT, name + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
for (let k = a - 1; k <= b - 1; k++) {
  const s = steps[k], n = Math.round((s.dur - s.t0) * fps);
  for (let i = k > a - 1 ? 1 : 0; i <= n; i++) {          // later steps skip frame 0: it equals the previous step's last frame
    const t = i === n ? s.dur : s.t0 + i / fps;
    const b64 = await page.evaluate(([k, t, y, h, sc, noX]) => {
      const S = window.__anim.steps(), prev = k - 1;
      window.__seek(k, t, window.__anim.gtBase(k) + t, noX ? k : prev, prev >= 0 ? S[prev].dur : 0);
      const c = document.createElement('canvas'); c.width = 1920 * sc; c.height = h * sc;
      c.getContext('2d').drawImage(document.getElementById('c'), 0, y * sc, 1920 * sc, h * sc, 0, 0, 1920 * sc, h * sc);
      return c.toDataURL('image/png').slice(22);
    }, [k, t, crop.y, crop.h, scale, false]);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  console.log('step', k + 1, s.slug, 'done');
}
ff.stdin.end(); await done; await browser.close(); console.log('wrote', path.join(OUT, name + '.mp4'));
