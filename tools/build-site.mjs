// Build the public site (GitHub Pages): only the animation viewer, no elements page, no render tools, no papers. The videos it plays
// are added by the Pages workflow from the release "videos".
//   node tools/build-site.mjs            -> _site/  (index.html, css/viewer.css, js/ minus the elements page)
// The look (look/*.md) is baked into js/look.js first, so the site shows exactly the textures and colours the renders use.
// Images are already embedded in js/core/assets.js, so nothing under assets/ is needed.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, '_site');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-look.mjs')], { stdio: 'inherit' });
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SKIP = new Set(['js/gallery.js']);      // the elements page stays in the local repo only
const copy = rel => { const src = path.join(ROOT, rel), dst = path.join(OUT, rel);
  if (fs.statSync(src).isDirectory()) { for (const f of fs.readdirSync(src)) if (!f.startsWith('.')) copy(path.join(rel, f)); return; }
  if (SKIP.has(rel.split(path.sep).join('/'))) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); };
copy('js'); copy(path.join('css', 'viewer.css'));
// the viewer, without its link to the elements page
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('\n').filter(l => !l.includes('href="gallery.html"')).join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`site: ${path.relative(ROOT, OUT)}/ (${(size(OUT) / 1e6).toFixed(1)} MB)`);
