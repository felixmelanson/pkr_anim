'use strict';
/* Colour overrides edited on the elements page (gallery.html), saved in this browser and applied on load to PALETTES
   (js/core/theme.js) in both the animation and the gallery, so a colour changed there shows up in the scenes too.
   Stored as { dark: { 'tp.astro.rim': '#68decc', ... }, light: { ... } }: a dotted path into PALETTES[theme].
   Load this right after theme.js (and js/look.js, the project look built from look/LOOK.md). */
// the project look (look/LOOK.md → js/look.js) is applied first and becomes the baseline: ↺ in the gallery returns to it
if (typeof LOOK !== 'undefined') for (const [theme, cols] of Object.entries(LOOK.palette || {})) for (const [path, hex] of Object.entries(cols)) {
  const ks = path.split('.'), last = ks.pop(), o = ks.reduce((x, k) => (x == null ? x : x[k]), PALETTES[theme]);
  if (o && Array.isArray(o[last])) { const n = parseInt(hex.slice(1), 16); o[last] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
}
// microglia colour tests (?mic=1..4): peridot between the old lime (#7bc128) and the olive of jsons2 (#c1ba28)
const MIC_VARS = {
  1: { rim: '#b8e040', body: '#5c8c16', fil: '#ecff70', nuc: '#22340a' },      // peridot
  2: { rim: '#a4e050', body: '#4e8c24', fil: '#dcff80', nuc: '#1c340e' },      // greener peridot
  3: { rim: '#cce048', body: '#788c14', fil: '#f6ff78', nuc: '#2c320a' },      // yellower (toward the olive, but saturated)
  4: { rim: '#c4f060', body: '#6ea226', fil: '#f4ff98', nuc: '#283c10' },      // lightest peridot
};
{ const v = MIC_VARS[new URLSearchParams(location.search).get('mic')]; if (v) for (const k in v) { const n = parseInt(v[k].slice(1), 16); PALETTES.dark.tp.micro[k] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } }
const PAL_DEFAULTS = structuredClone(PALETTES);
const PAL_KEY = 'pkr.palette.v1';
const palWalk = (root, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), root);
const palDefault = (theme, path) => palWalk(PAL_DEFAULTS[theme], path);
const palCurrent = (theme, path) => palWalk(PALETTES[theme], path);
function palWrite(theme, path, val) {
  const ks = path.split('.'), last = ks.pop(), o = palWalk(PALETTES[theme], ks.join('.'));
  if (o && Array.isArray(o[last])) o[last] = val.slice();
}
function palLoad() { try { return JSON.parse(localStorage.getItem(PAL_KEY)) || {}; } catch (e) { return {}; } }
function palSave(o) { try { localStorage.setItem(PAL_KEY, JSON.stringify(o)); } catch (e) { } }
const hexToRgbArr = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbArrToHex = c => '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/* set (hex) or clear (null) one override, save, and apply it */
function palSetOverride(theme, path, hex) {
  const all = palLoad(); all[theme] = all[theme] || {};
  if (hex == null) { delete all[theme][path]; palWrite(theme, path, palDefault(theme, path)); }
  else { all[theme][path] = hex; palWrite(theme, path, hexToRgbArr(hex)); }
  if (!Object.keys(all[theme]).length) delete all[theme];
  palSave(all);
}
function palApplyAll() {
  const all = palLoad();
  for (const theme of Object.keys(all)) for (const [path, hex] of Object.entries(all[theme] || {})) if (palDefault(theme, path)) palWrite(theme, path, hexToRgbArr(hex));
}
palApplyAll();
