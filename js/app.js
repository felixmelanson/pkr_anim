'use strict';
// Results animation for Lourenco et al., 2013 (Cell Metab. 18:831). Viewer shell, step list and render loop
// (structure from astrocyte_anim/js/app.js). Scenes live in js/scenes/, numbers in js/data.js.
// Keys: space / right arrow / PgDn = next, left arrow / PgUp = back, R = replay step, F = fullscreen,
// L = light/dark, P = play/pause, C = captions on/off, T = drop element textures during playback, for speed (they always show when paused). Adding #7 to the URL jumps to step 7.
// V = switch scene 5 between the petri-dish version (default, experimental) and the original split screen (?s4=split loads the latter).
// URL flags: ?render=1 (offline capture: no controls, exact 1920×1080), ?captions=0 (clean variant), ?clay=0, ?theme=dark.
const cv = document.getElementById('c'); let ctx = cv.getContext('2d');   // ctx is swapped for an offscreen layer while a transition is composed
const QS = new URLSearchParams(location.search);
const RENDER_MODE = QS.has('render');
let CAPTIONS = QS.get('captions') !== '0';         // footer citation (the title and sub-line are not drawn)
const CLAY = QS.get('clay') !== '0';
{ const f = QS.get('fade'); if (f) { BAND_FADE.top = f === 'both' || f === 'top'; BAND_FADE.bottom = f === 'both' || f === 'bottom'; } }
if (QS.get('theme')) setThemeMode(QS.get('theme'));   // default is dark (pitch-black stage); ?theme=light for the light one
if (QS.get('rim') === 'light') RIM.light = true;   // I key toggles at runtime
setClayMax(1.6);     // cells that fill the frame (scene 1, the push-in) keep their clay shadow and volume; flat slabs opt out with claySuspend
// All scene art stays inside this band of the 1920×1080 stage; the caption sits above it and the citation below.
// tools/render.mjs --crop trims clips to exactly this band.
const CROP = FULL ? { y: 0, h: 1080 } : { y: 150, h: 800 };      // full-frame stage by default (culture.js); ?full=0 restores the 800 px band
let SCL = 1, DPR = 1, DPR_CAP = 2;      // DPR_CAP: lowered to 1.5 by the adaptive quality, as its last step
// Viewer layout: the stage as wide as the window allows, a dock row under it (footer credit, controls, footer links); the dock
// row uses the in-animation footer's left / right margin and type, so it reads as the same footer. On narrow windows the credit
// and links drop under the controls. Fullscreen: the stage alone, centred, with the controls over it. (--stage-*, --dock-*: CSS)
function resize() {
  DPR = RENDER_MODE ? 1 : Math.min(paused ? 2 : DPR_CAP, window.devicePixelRatio || 1);      // paused: always full sharpness
  const w = innerWidth, h = innerHeight, fs = !RENDER_MODE && !!document.fullscreenElement, narrow = w < 1000;
  const dockH = RENDER_MODE || fs ? 0 : narrow ? 130 : 90;
  SCL = RENDER_MODE ? (+QS.get('scale') || 1) : Math.min(w / W, (h - dockH) / H);
  const cw = W * SCL, ch = H * SCL, left = (w - cw) / 2, room = Math.min(h - ch, dockH + 60);      // room: the stage and its dock are centred together
  const top = RENDER_MODE || fs ? (h - ch) / 2 : Math.max(0, (h - ch - room) / 2);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.style.left = left + 'px'; cv.style.top = top + 'px';
  cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
  const R = document.documentElement.style, set = (k, v) => R.setProperty(k, v);
  set('--stage-left', left + 'px'); set('--stage-top', top + 'px'); set('--stage-w', cw + 'px'); set('--stage-h', ch + 'px');
  set('--dock-top', (top + ch) + 'px'); set('--dock-h', room + 'px'); set('--foot-x', (TITLE_X * SCL) + 'px'); set('--foot-fs', Math.max(12, 19 * SCL) + 'px');
  document.body.classList.toggle('is-fullscreen', fs); document.body.classList.toggle('narrow', narrow);
}
IMG_READY.then(() => requestAnimationFrame(() => document.body.classList.add('laid-out')));      // the dock shows with the first frame
document.addEventListener('fullscreenchange', resize);
addEventListener('resize', resize); resize();

/* One entry per slide / video clip.
   fn = key into STEPDEF (js/scenes/steps.js); dur = seconds (one clip); busy = a representative crowded moment (contact sheet).
   cap / sub = on-screen caption (burned into out/clips, absent from out/clips-clean); cite = footer citation (course rule).
   owner: 'felix' = scenes 1-9 (his ~4 min block); 'teammate' = scenes 10-13 (the knockout block, handed over as clips).
   video:false would skip a step in the render run (none here). */
const STEPS = [
  { fn: 'bridge', slug: 'bridge-a-astrocyte-talk', dur: 10.6, busy: 6.4, owner: 'felix', cap: 'From the astrocyte talk: the same messenger', sub: 'activated microglia → IL-1α, TNF-α, C1q → A1 astrocytes kill retinal ganglion cells',
    cite: 'Liddelow et al., 2017 (Nature 541:481). Schematic' },
  { fn: 'bridgeB', slug: 'bridge-b-tnf-alone', dur: 8.6, busy: 5, owner: 'felix', cap: 'From the astrocyte talk: the same messenger', sub: 'take the astrocyte out of the picture: TNF-α goes on alone',
    cite: 'Liddelow et al., 2017 (Nature 541:481). Schematic' },
  { fn: 'anomaly', slug: 'anomaly-a-binding', dur: 9.2, busy: 8.8, owner: 'felix', cap: 'Phospho-PKR rises with or without bound oligomer', sub: 'hippocampal cultures, AβOs 500 nM, 3 h',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1F-H)' },
  { fn: 'anomalyHold', slug: 'anomaly-a2-ad-brains', dur: 2.0, busy: 2, owner: 'felix', cap: 'Phospho-PKR rises with or without bound oligomer', sub: 'hippocampal cultures, AβOs 500 nM, 3 h',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1F-H)' },      // S3b (durations: ANOM_D in steps.js)
  { fn: 'anomalyB', slug: 'anomaly-b-prior-model', dur: 6.4, busy: 6, owner: 'felix', cap: 'Phospho-PKR rises with or without bound oligomer', sub: 'hippocampal cultures, AβOs 500 nM, 3 h',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1F-H)' },      // S4A
  { fn: 'anomalyC', slug: 'anomaly-c-every-neuron', dur: 4.4, busy: 4, owner: 'felix', cap: 'Phospho-PKR rises with or without bound oligomer', sub: 'hippocampal cultures, AβOs 500 nM, 3 h',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1F-H)' },      // S4B
  { fn: 'anomalyD', slug: 'anomaly-d-fluorescence', dur: ANOM_D.c + ANOM_D.fig, gtDur: ANOM_D.c + ANOM_D.fig - ANOM_EXTRA, busy: 7, owner: 'felix', cap: 'Phospho-PKR rises with or without bound oligomer', sub: 'hippocampal cultures, AβOs 500 nM, 3 h',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1F-H)' },      // S4C (gtDur: see ANOM_D)
  { fn: 'messenger', slug: 'messenger', dur: 15.4, busy: 9.8, owner: 'felix', cap: 'A soluble messenger: TNF-α in the medium', sub: 'conditioned medium, n = 3 independent experiments, * p < 0.05',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 2H)' },
  { fn: 'controlDishA', slug: 'infliximab-control-a', dur: 8.6, busy: 8, owner: 'felix', cap: 'Infliximab blocks the signal, not the binding', sub: 'TNF-α neutralizing antibody, 1 µg/mL, added 30 min before AβOs',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 2A-G)' },      // S6A (durations: DISH_T in steps.js)
  { fn: 'controlDishB', slug: 'infliximab-control-a2', dur: 5.2, busy: 5, owner: 'felix', cap: 'Infliximab blocks the signal, not the binding', sub: 'TNF-α neutralizing antibody, 1 µg/mL, added 30 min before AβOs',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 2A-G)' },      // S6B
  { fn: 'controlDishC', slug: 'infliximab-control-a3', dur: 4.6, gtDur: 19.2 - 8.6 - 5.2, busy: 4.6, owner: 'felix', cap: 'Infliximab blocks the signal, not the binding', sub: 'TNF-α neutralizing antibody, 1 µg/mL, added 30 min before AβOs',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 2A-G)' },
  { fn: 'controlBack', slug: 'infliximab-control-b', dur: 9.2, busy: 8.6, owner: 'felix', cap: 'Infliximab blocks the signal, not the binding', sub: 'direct binding is not the route; a secreted factor is',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 2A-G)' },
  { fn: 'vivo', slug: 'into-the-neuron', dur: 11.2, busy: 9, owner: 'felix', cap: 'Inside the neuron: which eIF2α kinase?', sub: 'PKR is activated, PERK is not, PKR inhibitor 1 µM blocks eIF2α-P',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1J-K; Fig. S2)' },
  { fn: 'eifSchem', slug: 'eif2a-schematic', dur: 10.0, busy: 8, owner: 'felix', cap: 'Inside the neuron: which eIF2α kinase?', sub: 'PKR is activated, PERK is not, PKR inhibitor 1 µM blocks eIF2α-P',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1J-K; Fig. S2)' },
  { fn: 'kinaseC', slug: 'which-kinase-c', dur: 8.8, busy: 6.6, owner: 'felix', cap: 'Inside the neuron: which eIF2α kinase?', sub: 'PKR is activated, PERK is not, PKR inhibitor 1 µM blocks eIF2α-P',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 1J-K; Fig. S2)' },
  { fn: 'vivoCard', slug: 'in-vivo-models', dur: 2.4, busy: 2.4, owner: 'felix', cap: 'From the dish to the animal', sub: 'the culture result, checked in two in vivo models',
    cite: 'Lourenco et al., 2013 (mice: Figs. 1E, 1I, 3, 5; monkeys: Fig. 1L-O)' },
  { fn: 'fork', slug: 'fork', dur: 20, busy: 16, owner: 'felix', cap: 'Phospho-PKR reaches two targets', sub: 'eIF2α-pSer51 and IRS-1pSer636',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 5A)' },
  { fn: 'salubrinal', slug: 'push-eif2a', dur: 18.0, busy: 15, owner: 'felix', cap: 'Force eIF2α-P alone: memory fails, IRS-1 does not move', sub: 'salubrinal (GADD34 inhibitor), 1 mg/kg i.p. × 7 d in mice, 10 µM in culture',
    cite: 'Adapted from Lourenco et al., 2013 (Figs. 4A, 5H)' },
  { fn: 'salubrinalB', slug: 'push-eif2a-b', dur: 9.2, busy: 6, owner: 'felix', cap: 'Force eIF2α-P alone: memory fails, IRS-1 does not move', sub: 'salubrinal (GADD34 inhibitor), 1 mg/kg i.p. × 7 d in mice, 10 µM in culture',
    cite: 'Adapted from Lourenco et al., 2013 (Figs. 4A, 5H)' },
  { fn: 'irsQuestion', slug: 'irs-question', dur: 7.2, busy: 7.2, owner: 'felix', cap: 'IRS-1: the open branch', sub: 'everything back to the disease state; IRS-1 → memory is still a question; the board becomes Fig. 7',
    cite: 'Adapted from Lourenco et al., 2013 (Fig. 7)' },
  // S14-S20: the manipulation block, rebuilt from BASE BOARD (S13's last frame). The old thaps / figure7 / koTnfr / koPkr / inflixVivo /
  // gridDone steps are kept in steps.js but no longer in the deck.
  { fn: 's14Inflix', slug: 'cut-messenger', dur: 13, busy: 11, owner: 'teammate', cap: 'Cut the messenger: infliximab', sub: '', cite: 'Adapted from Lourenco et al., 2013 (Fig. 3A)' },
  { fn: 's15Tnfr', slug: 'cut-receptor', dur: 14, busy: 12, owner: 'teammate', cap: 'Cut the receptor: TNFR1−/−', sub: '', cite: 'Adapted from Lourenco et al., 2013 (Fig. 3B-F)' },
  { fn: 's16Pkr', slug: 'cut-kinase', dur: 13.5, busy: 11, owner: 'teammate', cap: 'Cut the kinase: PKR−/−', sub: '', cite: 'Adapted from Lourenco et al., 2013 (Fig. 3G-I; Fig. 5B)' },
  { fn: 's17Sal', slug: 'force-kinase-branch', dur: 13, busy: 11, owner: 'teammate', cap: 'Force the kinase branch: salubrinal', sub: '', cite: 'Adapted from Lourenco et al., 2013 (Fig. 4A-H; Fig. 5E-H)' },
  { fn: 's18Thaps', slug: 'force-other-input', dur: 15.5, busy: 13, owner: 'teammate', cap: 'Force the other input: thapsigargin', sub: '', cite: 'Adapted from Lourenco et al., 2013 (Fig. 5C-D)' },
  { fn: 's19Table', slug: 'table', dur: 9.5, busy: 10, owner: 'teammate', cap: 'Four manipulations, two readouts', sub: '', cite: 'Summary of Lourenco et al., 2013 (Figs. 3-5; Fig. S5)' },
  { fn: 's20Close', slug: 'close', dur: 3.0, busy: 2.5, owner: 'teammate', cap: 'Close', sub: '', cite: 'Summary of Lourenco et al., 2013 (Figs. 3-5; Fig. S5)' },
];

// state: end state of each step, cached (pure function of the step list)
const END = [];
function endState(k) { if (k < 0) return S_INIT(); if (!END[k]) { const S = structuredClone(endState(k - 1)); STEPDEF[STEPS[k].fn].apply(S, STEPS[k].dur); END[k] = S; } return END[k]; }
function stateAt(k, t) { const S = structuredClone(endState(k - 1)); STEPDEF[STEPS[k].fn].apply(S, clamp(t, 0, STEPS[k].dur)); return S; }
// The infliximab control (two clips, a and b) has two interchangeable versions (js/scenes/steps.js): petri dishes, or the original split screen.
// (dish = 6A / 6B / 6C + back; split = one clip + two empty holds + back)
const S4 = { dish: [{ fn: 'controlDishA', dur: 8.6, busy: 8 }, { fn: 'controlDishB', dur: 5.2, busy: 5 }, { fn: 'controlDishC', dur: 4.6, gtDur: 19.2 - 8.6 - 5.2, busy: 4.6 }, { fn: 'controlBack', dur: 9.2, busy: 8.6 }],
  split: [{ fn: 'control', dur: 18.6, busy: 16.5 }, { fn: 'controlHold', dur: .3, busy: .3 }, { fn: 'controlHold', dur: .3, gtDur: .3, busy: .3 }, { fn: 'controlBackSplit', dur: 8.2, busy: 7.5 }] };
const S4_AT = () => STEPS.findIndex(x => x.slug === 'infliximab-control-a');
function setScene4(v) { const k = S4_AT(); S4[v].forEach((o, j) => Object.assign(STEPS[k + j], { gtDur: undefined }, o)); END.length = 0; onStepChange(); }
function drawStep(k, t, gt) {
  const S = stateAt(k, t), D = STEPDEF[STEPS[k].fn], tt = clamp(t, 0, STEPS[k].dur);
  const gc = gt - (S.lost || 0);          // the cells' own clock (it is eased to a stop at the end of the bridge and restarted after)
  resolveCam(S, gc);
  drawCulture(S, gc); drawBoard(S, gt); drawConfocal(S, gc);
  drawPanel(S);                           // frosted data panel (board scenes), under the step's charts and the legend
  legendBar(S);                           // arrow legend, bottom centre, from step 7 to step 14
  D.over(S, tt, gt);
  asymGrid(S.grid);                       // the table, when shown, is a glass panel over everything
  if (D.top) D.top(S, tt, gt);
}

let step = 0, prevStep = -1, prevT = 0, stepStart = performance.now(), frozen = null;
function go(k) {
  k = clamp(k, 0, STEPS.length - 1) | 0; if (k === step) return;
  const now = performance.now(); prevT = paused ? pauseT : (now - stepStart) / 1000;
  prevStep = step; step = k; stepStart = now; pauseT = 0;
  if (paused) pauseGT = now / 1000;
  history.replaceState(null, '', location.search + '#' + (step + 1));
  onStepChange();
}
let UI_MODAL = false;      // a panel is open (ui-panels.js): the stage keys are off
addEventListener('keydown', e => {
  if (UI_MODAL) return;
  if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); go(step + 1); }
  else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(step - 1); }
  else if (e.key === 'r' || e.key === 'R') { stepStart = performance.now(); prevStep = step; pauseT = 0; }
  else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (e.key === 'i' || e.key === 'I') { RIM.light = !RIM.light; }
  else if (e.key === 'c' || e.key === 'C') { CAPTIONS = !CAPTIONS; }
  else if (e.key === 'p' || e.key === 'P') { setPaused(!paused); }
  else if (e.key === 't' || e.key === 'T') { TEX_WHILE_PLAYING = !TEX_WHILE_PLAYING; }
  else if (e.key === 'v' || e.key === 'V') { setScene4(STEPS[S4_AT()].fn === 'control' ? 'dish' : 'split'); }
});

function applyTheme() {
  THEME.light = THEME.mode === 'light';
  const bg = THEME.light ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'; if (document.body.style.background !== bg) document.body.style.background = bg;
}
function paintStep(k, t, gt) {
  ctx.setTransform(SCL * DPR, 0, 0, SCL * DPR, 0, 0);
  ctx.fillStyle = rgb(COL.bg); ctx.fillRect(0, 0, W, H);
  const S = STEPS[k];
  ctx.save();
  const draw = () => { if (CLAY) withClay(ctx, !THEME.light, () => drawStep(k, t, gt)); else drawStep(k, t, gt); };
  if (texActive(k)) texPaint(draw); else draw();          // ?tex=N only: one look over the whole frame, for comparison (elements have their own: texEl)
  ctx.restore();
  // caption, sub-line and citation: each fades in over the first half second of its step
  // bottom left to step 6; in step 7 it fades out as the dishes zoom in, and fades back in top right once the view is in the culture (steps 8+: top right)
  const kQ = STEPS.findIndex(x => x.fn === 'irsQuestion');      // the step that reorganises the board into Fig. 7
  const kCB = STEPS.findIndex(x => x.slug === 'infliximab-control-b');      // the dishes → culture clip, where the citation moves top right
  if (k === kQ) { footer(S.cite, 1 - A(t, IRSQ_T.morph[0], IRSQ_T.morph[0] + .8), true); footer(S.cite, A(t, ...IRSQ_T.fig)); }      // top right until the board moves, then bottom left with the original figure
  else if (k > kQ) footer(S.cite, 1);                // after it the citation stays bottom left
  else if (k > kCB) footer(S.cite, 1, true);
  else if (k === kCB) { footer(S.cite, 1 - seg(t, 1.9, 2.6)); footer(S.cite, seg(t, 4.8, 5.6), true); }
  else footer(S.cite, 1);
}
// the previous step's final frame, drawn as an opaque layer at alpha a: every step opens on the exact last frame of
// the one before it and dissolves from there (.6 s), so consecutive clips join without a jump.
let XLAYER = null, XKEY = '';
function previousFinal(k, gt, a) {
  const P = STEPS[k - 1];
  if (!XLAYER) XLAYER = document.createElement('canvas');
  if (XLAYER.width !== cv.width || XLAYER.height !== cv.height) { XLAYER.width = cv.width; XLAYER.height = cv.height; XKEY = ''; }
  const key = `${k}|${THEME.mode}|${STEPS[k - 1].fn}`;      // painted once per transition, not every frame (a whole second frame per tick made the dissolve lag)
  if (key !== XKEY || RENDER_MODE) {
    const main = ctx; ctx = XLAYER.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, XLAYER.width, XLAYER.height);
    paintStep(k - 1, P.dur, gt);
    ctx = main; XKEY = key;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(XLAYER, 0, 0); ctx.restore();
}
const XFADE = .6;
let TEX_WHILE_PLAYING = true;                   // element textures always on; T drops them during playback if it gets too slow (they still show when paused)
function render(k, t, gt) {
  applyTheme();
  TEX_SKIP = !RENDER_MODE && !paused && !TEX_WHILE_PLAYING;
  texFrameTick((!RENDER_MODE && !paused && !frozen) || window.__texPlay === true);      // __texPlay: benchmarks      // live playback may reuse a cell's texture for a frame or two (texture.js)
  paintStep(k, t, gt);
  if (k > 0 && prevStep === k - 1) { if (!STEPDEF[STEPS[k].fn].noXfade) { const f = 1 - seg(t, 0, XFADE); if (f > 0) previousFinal(k, gt, f); } }      // noXfade steps open on the last frame already: no dip to black
  else if (!RENDER_MODE && prevStep !== k) { const f = 1 - seg(t, 0, .5); if (f > 0) { ctx.setTransform(SCL * DPR, 0, 0, SCL * DPR, 0, 0); ctx.fillStyle = rgb(COL.bg, f); ctx.fillRect(0, 0, W, H); } }
}

// Play / pause / scrub: each frame is a pure function of (step, t, gt).
var paused = false, pauseT = 0, pauseGT = 0;      // var: resize() reads paused before this line runs
function setPaused(p) {
  p = !!p; if (p === paused) return;
  const now = performance.now();
  if (p) { pauseT = (now - stepStart) / 1000; pauseGT = now / 1000; }
  else stepStart = now - pauseT * 1000;
  paused = p;
  if (DPR_CAP < 2) resize();      // the adaptive quality's lower density is for playback only
  onPlayStateChange();
}
function scrubTo(t) {
  if (!paused) setPaused(true);
  pauseGT += Math.max(0, t) - pauseT;
  pauseT = Math.max(0, t);
  onPlayStateChange();
}
function onStepChange() {}
function onPlayStateChange() {}
function onThemeChange() {}

/* Adaptive quality, only for browsers that cannot keep up (Firefox, slow machines): while playing, the frame time is watched;
   when it stays slow, cells are re-textured less often (TEX_N: every 3rd frame → up to every 16th; the reuse is invisible at these
   speeds) and, as a last step, the stage is drawn at 1.5× instead of 2× pixel density. It steps back up when there is headroom.
   Chrome on a recent Mac stays at level 0, exactly as before. */
// levels 0-4: TEX_N; level 5: 1.5× pixel density; level 6: 1× while playing (paused: full sharpness)
const QUAL_N = [3, 5, 8, 12, 16]; let QUAL = 0, QUAL_EMA = 16, QUAL_LAST = 0, QUAL_COUNT = 0, QUAL_GOOD = 0;
function qualityTick(now) {
  if (RENDER_MODE || paused || STAGE_FROZEN || document.hidden) { QUAL_LAST = 0; return; }
  if (QUAL_LAST) { const dt = Math.min(250, now - QUAL_LAST); QUAL_EMA += (dt - QUAL_EMA) * .15; }
  QUAL_LAST = now; if (now - QUAL_COUNT < 600) return; QUAL_COUNT = now;      // judged every 0.6 s (by time, so a slow browser adapts as fast as a quick one)
  if (QUAL_EMA > 27 && QUAL < QUAL_N.length + 1) { QUAL = Math.min(QUAL_N.length + 1, QUAL + (QUAL_EMA > 70 ? 2 : 1)); QUAL_GOOD = 0; applyQuality(); }
  else if (QUAL_EMA < 13 && QUAL > 0) { if (++QUAL_GOOD >= 3) { QUAL--; QUAL_GOOD = 0; applyQuality(); } }
  else QUAL_GOOD = 0;
}
function applyQuality() {
  TEX_N = QUAL_N[Math.min(QUAL, QUAL_N.length - 1)];
  const cap = QUAL > QUAL_N.length ? 1 : QUAL === QUAL_N.length ? 1.5 : 2; if (cap !== DPR_CAP) { DPR_CAP = cap; resize(); }
}
let STAGE_FROZEN = false, PAUSE_KEY = '';      // STAGE_FROZEN: a panel is open over the stage (ui-panels.js): nothing is redrawn
function frame(now) {
  qualityTick(now);
  if (!frozen && !STAGE_FROZEN && !(typeof VIDEO_ON !== 'undefined' && VIDEO_ON)) {      // VIDEO_ON: the site plays the rendered clips (video.js)
    if (paused) {      // paused: draw only when something changed (step, scrub position, size), not the same picture every frame
      const key = `${step}|${pauseT}|${pauseGT}|${cv.width}x${cv.height}|${prevStep}`;
      if (key !== PAUSE_KEY) { PAUSE_KEY = key; render(step, pauseT, pauseGT); }
    }
    else { PAUSE_KEY = ''; render(step, (now - stepStart) / 1000, now / 1000); }
  }
  requestAnimationFrame(frame);
}
(function init() {
  if (RENDER_MODE) document.body.classList.add('render');
  if (QS.get('s4') === 'split') setScene4('split');
  if (KIN4) { Object.assign(STEPS.find(x => x.fn === 'kinaseC'), { dur: 10.8, busy: 7.6 }); END.length = 0; }
  // ?s11v2=1: S11v2 (the fork straight after S9B, no in-vivo card) in place of S10 + S11, for rendering that clip
  if (QS.get('s11v2') === '1') { const k = STEPS.findIndex(x => x.fn === 'vivoCard'), f = STEPS[k + 1]; STEPS.splice(k, 2, { ...f, fn: 'forkV2', slug: 'fork-v2', gtDur: STEPS[k].dur + f.dur, gtWarp: true }); END.length = 0; }
  const h = parseInt(location.hash.slice(1)); if (!isNaN(h)) { step = clamp(h - 1, 0, STEPS.length - 1) | 0; }
  IMG_READY.then(() => requestAnimationFrame(frame));
})();

// Hooks for tools/render.mjs and tools/contact.mjs.
// gtBase(k) is the global clock at the start of step k, as if every earlier step had played for exactly its dur,
// so idle motion continues from one clip into the next.
const gtBase = k => 50 + STEPS.slice(0, k).reduce((s, x) => s + (x.gtDur ?? x.dur ?? 0), 0);      // gtDur: a clip that runs longer than its share of the global clock (S6C)
// the global clock at time t of step k; a gtWarp step runs its clock faster so it spans its whole gtDur (S11v2)
const gtAt = (k, t) => { const x = STEPS[k]; return gtBase(k) + (x.gtWarp ? t * x.gtDur / x.dur : t); };
window.__seek = (k, t, gt, prev, pt) => { frozen = true; step = k; prevStep = prev ?? k; prevT = pt ?? 99; render(k, t, gt ?? gtAt(k, t)); };
window.__anim = {
  crop: CROP, ready: IMG_READY,
  steps: () => STEPS.map((s, i) => ({ i, slug: s.slug, dur: s.dur, t0: s.t0 || 0, video: s.video !== false, busy: s.busy, cap: s.cap, cite: s.cite, owner: s.owner })),
  gtBase, gtAt, setScene4, setTheme: m => { setThemeMode(m); onThemeChange(); }, setCaptions: v => { CAPTIONS = !!v; },
};
