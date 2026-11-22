'use strict';
// Colours and light/dark theme (structure from astrocyte_anim/js/core/theme.js, palette re-keyed for this talk).
// Semantic roles, the same in all scenes and both themes:
//   AβO = red, TNF-α = violet, phospho-mark = gold, cells = teal / green, signalling proteins = slate,
//   blocked / absent / not activated = desaturated grey (never a red X), interventions = ink pills.
const PALETTES = {
  dark: {
    tp: {
      astro:  { rim: [104, 222, 204], body: [22, 100, 97],  fil: [186, 255, 240], nuc: [9, 44, 47] },
      micro:  { rim: [126, 228, 176], body: [24, 100, 78],  fil: [190, 255, 222], nuc: [9, 46, 37] },
      neuron: { rim: [108, 198, 234], body: [20, 80, 108],  fil: [182, 232, 255], nuc: [9, 38, 56] },
      oligo:  { rim: [144, 166, 236], body: [36, 56, 112],  fil: [205, 215, 255], nuc: [17, 25, 58] },
    },
    coral: { rim: [255, 190, 70], body: [128, 84, 16], fil: [255, 226, 160], nuc: [70, 44, 8] },      // "active" tint = phospho gold
    grayp: { rim: [116, 124, 134], body: [36, 40, 46], fil: [150, 158, 168], nuc: [22, 24, 28] },
    a1: { rim: [255, 144, 120], body: [124, 46, 40], fil: [255, 208, 192], nuc: [56, 19, 17] },         // A1 astrocyte: the coral of astrocyte_anim
    rgc: { rim: [240, 150, 208], body: [104, 38, 86], fil: [255, 216, 240], nuc: [52, 16, 42] },        // retinal ganglion cell (bridge only)
    pc: { tnf: [166, 134, 255], abo: [255, 112, 92], ab: [214, 224, 238], phos: [255, 190, 60], gray: [124, 132, 142], other: [116, 124, 134],
          il1: [246, 186, 68], c1q: [186, 228, 90], lps: [232, 226, 204], tox: [255, 136, 110], drug: [236, 242, 246], ins: [120, 214, 190] },
    np: {
      prot:  { rim: [150, 170, 200], body: [44, 56, 76],   fil: [200, 214, 236], nuc: [28, 36, 50] },
      on:    { rim: [255, 196, 80],  body: [120, 82, 18],  fil: [255, 232, 170], nuc: [70, 46, 8] },
      off:   { rim: [112, 120, 130], body: [38, 42, 48],   fil: [150, 158, 168], nuc: [24, 26, 30] },
      tnfr:  { rim: [176, 150, 255], body: [58, 46, 110],  fil: [220, 208, 255], nuc: [34, 26, 70] },
      ir:    { rim: [120, 214, 190], body: [26, 86, 76],   fil: [200, 248, 234], nuc: [12, 46, 40] },
      lipid: { rim: [176, 132, 40],  body: [96, 68, 14],   fil: [140, 104, 30],  nuc: [50, 36, 8] },       // dark mustard
      er:    { rim: [170, 156, 220], body: [50, 44, 84],   fil: [214, 204, 250], nuc: [30, 26, 54] },
      ribo:  { rim: [160, 174, 186], body: [54, 62, 70],   fil: [210, 220, 228], nuc: [30, 36, 42] },
      syn:   { rim: [126, 228, 176], body: [24, 100, 78],  fil: [190, 255, 222], nuc: [9, 46, 37] },
    },
    fl: { red: [255, 48, 40], green: [60, 255, 96], blue: [70, 110, 255] },       // confocal channels: AβO, pPKR, DAPI
    board: { cyto: [60, 41, 10], memb: [102, 76, 29], head: [102, 76, 29], tail: [166, 136, 84] },   // the neuron's interior (scenes 5-13): cytoplasm, membrane edge, lipid heads and tails, measured off the textured lit neuron at the end of the push-in (#3c290a, #664c1d) so the hand-over has no jump
    col: { text: [224, 232, 238], dim: [140, 154, 166], teal: [104, 222, 204], coral: [255, 144, 120], bg: [0, 0, 0], ink: [236, 242, 246], foot: [124, 138, 150], legend: [190, 202, 212],
           phos: [255, 196, 80], abo: [255, 128, 108], tnf: [182, 156, 255], edge: [236, 242, 246], edgeDash: [214, 220, 228], panel: [14, 18, 24], panelRim: [70, 82, 96], cyto: [10, 26, 36], grid: [56, 66, 78], good: [126, 228, 176] },
    ui: { cellMix: .32, shadow: [0, 0, 0], shadowK: 1, dish: [15, 24, 31], dishHi: .045, dishLo: .3, rim: [196, 214, 228], rimA: 1, glare: 1, punct: [226, 250, 255], casp: [255, 184, 80], pill: [7, 11, 15], pillA: .78 },
  },
  light: {
    tp: {
      astro:  { rim: [0, 128, 116],  body: [208, 240, 234], fil: [0, 104, 94],   nuc: [112, 176, 166] },
      micro:  { rim: [16, 128, 80],  body: [202, 236, 216], fil: [10, 100, 62],  nuc: [116, 178, 140] },
      neuron: { rim: [0, 108, 160],  body: [198, 228, 244], fil: [0, 86, 130],   nuc: [110, 160, 196] },
      oligo:  { rim: [72, 88, 184],  body: [222, 226, 248], fil: [56, 70, 160],  nuc: [150, 160, 214] },
    },
    coral: { rim: [196, 124, 0], body: [253, 226, 156], fil: [150, 92, 0], nuc: [226, 176, 86] },       // "active" tint = phospho gold
    grayp: { rim: [118, 126, 136], body: [234, 236, 239], fil: [128, 136, 146], nuc: [184, 190, 198] },
    a1: { rim: [204, 66, 44], body: [252, 220, 212], fil: [176, 50, 30], nuc: [226, 140, 122] },
    rgc: { rim: [176, 60, 132], body: [248, 218, 236], fil: [150, 40, 110], nuc: [214, 150, 190] },
    pc: { tnf: [110, 76, 214], abo: [208, 60, 42], ab: [62, 76, 96], phos: [238, 164, 0], gray: [146, 154, 164], other: [124, 132, 142],
          il1: [184, 118, 0], c1q: [96, 136, 0], lps: [128, 104, 56], tox: [206, 66, 42], drug: [28, 36, 46], ins: [0, 132, 112] },
    np: {
      prot:  { rim: [76, 94, 122],   body: [210, 220, 234], fil: [48, 62, 86],    nuc: [150, 164, 186] },
      on:    { rim: [190, 120, 0],   body: [254, 224, 148], fil: [140, 84, 0],    nuc: [232, 180, 80] },
      off:   { rim: [138, 146, 156], body: [234, 236, 240], fil: [128, 136, 146], nuc: [196, 202, 208] },
      tnfr:  { rim: [96, 78, 176],   body: [220, 212, 246], fil: [70, 54, 150],   nuc: [160, 148, 220] },
      ir:    { rim: [0, 124, 110],   body: [204, 236, 230], fil: [0, 96, 86],     nuc: [110, 180, 168] },
      lipid: { rim: [170, 124, 20],  body: [236, 204, 120], fil: [200, 160, 60],  nuc: [170, 130, 40] },
      er:    { rim: [124, 106, 170], body: [230, 222, 244], fil: [96, 80, 146],   nuc: [176, 164, 212] },
      ribo:  { rim: [100, 114, 126], body: [222, 228, 232], fil: [70, 84, 96],    nuc: [160, 170, 180] },
      syn:   { rim: [16, 128, 80],   body: [202, 236, 216], fil: [10, 100, 62],   nuc: [116, 178, 140] },
    },
    fl: { red: [255, 48, 40], green: [60, 255, 96], blue: [70, 110, 255] },
    board: { cyto: [244, 214, 150], memb: [196, 124, 0], head: [255, 190, 69], tail: [255, 244, 200] },
    col: { text: [22, 30, 38], dim: [86, 98, 110], teal: [0, 120, 108], coral: [190, 58, 36], bg: [255, 255, 255], ink: [20, 28, 36], foot: [104, 116, 128], legend: [62, 74, 86],
           phos: [168, 104, 0], abo: [186, 52, 34], tnf: [98, 66, 200], edge: [24, 32, 42], edgeDash: [150, 158, 168], panel: [246, 248, 250], panelRim: [196, 204, 212], cyto: [236, 245, 250], grid: [214, 220, 226], good: [0, 120, 90] },
    ui: { cellMix: .1, shadow: [30, 50, 70], shadowK: .22, dish: [234, 239, 243], dishHi: .55, dishLo: .035, rim: [104, 124, 140], rimA: 1.8, glare: 0, punct: [0, 96, 128], casp: [240, 150, 30], pill: [255, 255, 255], pillA: .9 },
  },
};

// THEME is a runtime setting toggled from the viewer UI (mode 'light' | 'dark').
const THEME = { mode: 'dark', light: false };     // default: pitch-black stage (?theme=light or the L key for the light one)
function setThemeMode(mode) { THEME.mode = mode === 'dark' ? 'dark' : 'light'; }
const PAL = () => THEME.light ? PALETTES.light : PALETTES.dark;
// RIMLIGHT: force the lit-rim look (border lighter than the body) in any theme. Dark already has it; in light mode the
// rim/body pair of every palette entry is swapped when the rim is the darker of the two. Toggle with I or ?rim=light.
const RIM = { light: false, rimK: .12, bodyK: .42 };   // how far each side moves from the pale body colour toward the dark rim colour
const lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
const rimFix = e => (RIM.light && e && e.rim && e.body && lum(e.rim) < lum(e.body)) ? { ...e, rim: mix(e.body, e.rim, RIM.rimK), body: mix(e.body, e.rim, RIM.bodyK) } : e;   // pale tint rim over a mid-tone body, not a full swap
const NESTED = { tp: 1, np: 1 };
const themed = key => new Proxy({}, { get: (_, p) => {
  const v = PAL()[key][p];
  return NESTED[key] || key === 'coral' || key === 'grayp' ? (key === 'coral' || key === 'grayp' ? (p === 'rim' || p === 'body' ? rimFixField(PAL()[key], p) : v) : rimFix(v)) : v;
} });
function rimFixField(e, f) { const r = rimFix(e); return r[f]; }
const TP = themed('tp'), CORAL = themed('coral'), GRAYP = themed('grayp'), PC = themed('pc'), COL = themed('col'), UI = themed('ui'), NP = themed('np');
const A1P = new Proxy({}, { get: (_, p) => rimFix(PAL().a1)[p] }), RGCP = new Proxy({}, { get: (_, p) => rimFix(PAL().rgc)[p] });
const palMix = (p, q, t) => ({ rim: mix(p.rim, q.rim, t), body: mix(p.body, q.body, t), fil: mix(p.fil, q.fil, t), nuc: mix(p.nuc, q.nuc, t) });
const fg = (a = 1) => rgb(PAL().col.ink, a);
const shade = (a = 1) => rgb(UI.shadow, a * UI.shadowK);
// Avenir Next (macOS) to match the slides; falls back to Helvetica / Arial elsewhere.
const FONT = '"Avenir Next","Avenir","Helvetica Neue",Helvetica,Arial,sans-serif';

// Text drawing. o.halo adds a soft outline so text stays readable over cells. Text never goes through clay.
function txt(s, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0.004 || !s) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `${o.it ? 'italic ' : ''}${o.w || 500} ${o.size || 20}px ${FONT}`;
  ctx.fillStyle = rgb(o.col || COL.text);
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = rgb(o.haloCol || COL.bg, o.haloA ?? .88); ctx.lineWidth = o.halo; ctx.strokeText(s, x, y); }
  ctx.fillText(s, x, y);
  ctx.restore();
}
function txtW(s, o = {}) { ctx.save(); ctx.font = `${o.it ? 'italic ' : ''}${o.w || 500} ${o.size || 20}px ${FONT}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }
// Slide heading: left-aligned title + optional sub-line, and the footer citation. Copy lives on each STEPS entry (app.js).
// Drawn only when captions are on (viewer default; `?captions=0` or render.mjs --no-captions turns them off).
const TITLE_X = 80, TITLE_Y = 92, FOOT_Y = 1046;
// The title and sub-line are no longer drawn (they go on custom glass panels in the slides); the STEPS cap / sub strings stay as notes.
function caption() { }
function subcap() { }
// Footer citation: bottom left, or top right (right = true). It does not travel: from step 7 it fades out at the bottom left and back in at the top right.
function footer(s, a, right = false) {
  if (!s || !CAPTIONS || a <= .004) return;
  txt(s, right ? W - 80 : TITLE_X, right ? 54 : FOOT_Y, { a, size: 19, w: 500, col: COL.foot, align: right ? 'right' : 'left' });
}
