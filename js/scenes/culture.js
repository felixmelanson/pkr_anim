'use strict';
// Culture-scale world (scenes 0-4, and the start of 5): nine pyramidal neurons and three microglia on a coverslip,
// AβOs and TNF-α in the medium. Everything is drawn from the state S (js/scenes/steps.js) and the global clock gt.
// Scene 4 (experimental variant) shows the same culture inside two tilting petri dishes: see drawDishes().
// Full-frame 1920x1080 stage is the default (no top/bottom band, no fades; ?full=0 restores the old 800 px band). The coverslip is zoomed in to fill the height
// and the sides crop a little. ?extra=1 adds cells in the strips above and below instead (busier).
const FULL = new URLSearchParams(location.search).get('full') !== '0', EXTRA = FULL && new URLSearchParams(location.search).get('extra') === '1',   // EXTRA: add cells in the top/bottom strips; otherwise the same cells, zoomed in to fill the height (sides crop)
   TAG_TOP = 78,
   TAG_BOT = FOOT_Y + 4 - 38 * 2.25 / 2 + 38 * .12;      // TAG_BOT: y of a glass tag whose panel bottom sits level with the citation's bottom (baseline + descender)      // TAG_TOP: y of the glass title tags in full mode
const WORLD = EXTRA ? { x: 60, y: 40, w: 1130, h: 1010 } : { x: 60, y: 168, w: 1130, h: 772 };                                       // where the cells live, in world units
const FC = { x: LAY.field.x + LAY.field.w / 2, y: FULL ? H / 2 : LAY.field.y + LAY.field.h / 2 };      // where the camera target lands on screen
const CULT_CAM = { x: WORLD.x + WORLD.w / 2, y: 566, z: FULL && !EXTRA ? 1.097 * 1080 / 800 : 1.097, ax: W / 2 };              // the whole coverslip: camera target, zoom, and where it sits on screen
/* From scene 2 on the culture is spread sideways (S.spread 0..1): every cell and molecule moves away from the hero's column by
   SPREAD of its distance, so the coverslip fills the stage out to the slim chart column without cropping it top and bottom.
   The hero does not move. Inside the round dishes of scene 4 the spread is taken back out. */
const SPREAD = .38, spX = (x, sp) => x + (x - 625) * SPREAD * sp;
const nXY = (S, i) => [spX(NEURON_AT[i][0], S.spread || 0), NEURON_AT[i][1]], mXY = (S, i) => [spX(MIC_AT[i][0], S.spread || 0), MIC_AT[i][1]];
const NEURON_AT = [[215, 330, 1.7], [565, 290, 1.3], [985, 320, 1.9], [240, 600, 1.45], [625, 596, 1.57], [1020, 600, 1.75], [462, 836, 1.25], [742, 866, 1.9], [1035, 850, 1.4]];
const HERO = 4, BOUND = EXTRA ? [0, 2, 5, 7, 10, 12] : [0, 2, 5, 7];                // oligomer puncta on these; the hero (4) is unbound
const SPLIT_X = 812;                                 // scene 4 (split-screen variant): left = AβOs, right = infliximab + AβOs
if (EXTRA) NEURON_AT.push([420, 108, 1.5], [790, 96, 1.4], [1150, 122, 1.6], [330, 1010, 1.2], [650, 1020, 1.4], [905, 1005, 1.1], [1190, 1015, 1.3]);   // 9-15: strips above and below (indices 10 and 12 carry oligomer)
const NEU = NEURON_AT.map((p, i) => new Cell('neuron', p[0], p[1], 900 + i * 13, 1.45, { pyr: true, axAng: p[2], axLen: 118, len: 22, drift: 1.5 }));
const MIC_AT = [[712, 488], [395, 448], [880, 728]];
if (EXTRA) MIC_AT.push([140, 130], [980, 1000]);
const MICG = MIC_AT.map((p, i) => new Cell('micro', p[0], p[1], 300 + i * 11, 1.35, { len: 17, drift: 3 }));
const HEROXY = [NEURON_AT[HERO][0], NEURON_AT[HERO][1]];

/* Bridge (step 0), the previous talk's cast (Liddelow et al. 2017). Laid out as a column on the left of the centre pair:
   activated microglia (below) → IL-1α, TNF-α, C1q rise → astrocyte (above) turns A1 (coral) → the retinal ganglion cell
   to its right is lost. The RGC stands where culture neuron 1 is; it is its own cell (multipolar, long axon with a growth
   cone, rose) and it does not come back. The bridge also re-stages a few culture cells; every offset below is scaled by
   S.br.layN / S.br.layM and has eased to zero by the time the bridge ends, so scene 1 onward sees the plain culture. */
const ASTRO = new Cell('astro', 410, 392, 4242, 1.55, { drift: 2 });
const RGC = new Cell('neuron', 640, 300, 771, 1.45, { axAng: -.22, axLen: 150, len: 24, drift: 1.5, get pal() { return RGCP; } });
const MIC_OFF = [[86, 0], [-40, 160], [0, 0], [0, 0], [0, 0]];        // bridge: right microglia midway between the centre and right pairs; left one down, under the astrocyte
const NEU_OFF = {}, NEU_HID = [0, 3];                // bridge: both left-hand neurons absent (the microglia and astrocyte take that space)
const BR_MIC = [MIC_AT[1][0] + MIC_OFF[1][0], MIC_AT[1][1] + MIC_OFF[1][1]];   // the microglia that releases IL-1α / TNF-α / C1q
const BR_TYPES = ['il1', 'tnf', 'c1q'], BR_NAMES = ['IL-1α', 'TNF-α', 'C1q'];
const BR_DEBUG_DEFAULTS = {
  component: { microglia: [-185, 0], astrocyte: [-17, -6], il1: [-77, 89], tnf: [-120, 52], c1q: [-133, -9] },
  label: { microglia: [0, 20], astrocyte: [6, 26], il1: [-30, 24], tnf: [-1, -1], c1q: [27, 30], retinal: [-55, -61], lipid: [-34, -11], pyramidal: [0, 11], hippocampus: [0, 13] },
};
const BR_DEBUG = structuredClone(BR_DEBUG_DEFAULTS);
// tissue-scale diagram anchors (scene 4 → 5), world coordinates around the hero neuron
const T_ABO0 = [452, 468], T_TNF0 = [772, 548];

// The field of view is a full-bleed horizontal band (y 150-950, the whole 1920 width) that melts into the page at the top and
// bottom edges, as in astrocyte_anim, instead of a rounded box: no panel, no outline, no tinted background.
const BAND = FULL ? { y: 0, h: H, fade: 0 } : { y: 150, h: 800, fade: 70 };
const BAND_FADE = { top: !FULL, bottom: !FULL };          // ?fade=none|top|bottom drops one or both soft edges (for cropped video tests)
function fieldClip(inset = 0) { ctx.beginPath(); ctx.rect(0, BAND.y + inset, W, BAND.h - inset * 2); }
function fieldPanel() { }                              // kept so scenes can still call it; the band has no slab of its own
function bandFades(a = 1) {                            // soft top/bottom edge: page colour over the outer 70 px of the band
  if (a <= .004) return;
  const f = BAND.fade, c = ctx; c.save(); c.globalAlpha *= a; claySuspend(() => {
    for (const [y0, y1] of [[BAND.y, BAND.y + f], [BAND.y + BAND.h, BAND.y + BAND.h - f]].filter((_, i) => i ? BAND_FADE.bottom : BAND_FADE.top)) {
      const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(COL.bg, 1)); g.addColorStop(1, rgb(COL.bg, 0));
      c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, f);
    }
  }); c.restore();
}
/* Camera: world point (cam.x, cam.y) sits at the screen anchor (cam.ax, cam.ay; default the field centre), scaled by cam.z and
   turned by cam.rot. Scene 5 uses the anchor and the rotation to lay the hero's membrane flat on the board's bilayer. */
const toScreen = (S, x, y) => { const c = S.cam, r = c.rot || 0, dx = (x - c.x) * c.z, dy = (y - c.y) * c.z, cs = Math.cos(r), sn = Math.sin(r); return [dx * cs - dy * sn + (c.ax ?? FC.x), dx * sn + dy * cs + (c.ay ?? FC.y)]; };
function worldXf(S) { const c = S.cam; ctx.translate(c.ax ?? FC.x, c.ay ?? FC.y); if (c.rot) ctx.rotate(c.rot); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); }
/* The stretch of hero membrane the scene-5 camera flies into: the upper edge of the first basal dendrite, on the right of the
   soma (just below where the TNF-α arrow lands). It is close to level already, so the view only has to settle by a few
   degrees to make it horizontal. Deep in the zoom the rim is held at the board membrane's on-screen thickness (heroRim). */
const EDGE_PRIM = 1, EDGE_F = .62;
const heroRim = z => Math.min(Math.min(2.4, 1.4 / NEU[HERO].sc), MEMB_TH / (z * NEU[HERO].sc));
/* Called once per frame before anything is drawn (S is a fresh copy): cam.track pulls the camera target onto that edge,
   cam.rotK levels it. */
function resolveCam(S, gt) {
  const c = S.cam; if (!(c.track > 0)) return;
  const E = NEU[HERO].strandEdge(gt, EDGE_PRIM, EDGE_F, heroRim(c.z));
  let lv = -E.tan; lv = Math.atan2(Math.sin(lv), Math.cos(lv)); if (Math.abs(lv) > Math.PI / 2) lv -= Math.sign(lv) * Math.PI;
  c.x = lerp(c.x, E.p[0], c.track); c.y = lerp(c.y, E.p[1], c.track); c.rot = (c.rotK || 0) * lv;
}

// drifting molecules: fixed home positions in the culture, each appears at its own time and flies in from an origin
function swarm(type, n, seed, gt, o) {
  const F = WORLD;
  for (let i = 0; i < n; i++) {
    const hx = hash(seed + i * 1.71), hy = hash(seed * 1.3 + i * 2.93), h3 = hash(seed * .7 + i * 5.1);
    let bx = F.x + 40 + hx * (F.w - 80), by = F.y + 40 + hy * (F.h - 80);
    if (o.home) { const hm = o.home(i); if (!hm) continue; [bx, by] = hm; }
    const vis = o.vis(i, h3, bx, by); if (vis <= .003) continue;
    bx += Math.sin(gt * (.22 + h3 * .2) + i) * 9 + Math.sin(gt * .41 + i * 2.1) * 4; by += Math.cos(gt * (.2 + hx * .2) + i * 1.7) * 9;
    let x = bx, y = by;
    if (o.origin) { const og = o.origin(i, bx, by), k = eOut(vis); x = lerp(og[0], bx, k); y = lerp(og[1], by, k); }
    const ty = o.type ? o.type(i, bx, by) : type;
    if (o.sp) { x = spX(x, o.sp); }
    const rot = ty === 'abo' ? (h3 - .5) * .7 + Math.sin(gt * .3 + i) * .08 : h3 * TAU + gt * .2 * (hx - .5);      // the cylinder cluster stays near upright
    glyph(ctx, ty, x, y, (GSIZE[ty] || 12) * (.9 + h3 * .25) * (o.scale || 1), rot, clamp(vis * 3) * (o.a ?? 1));
  }
}
/* Bridge cytokines: world position + alpha of glyph k (0 IL-1α, 1 TNF-α, 2 C1q). They leave the microglia in turn and rise to
   the astrocyte above it; TNF-α alone then travels on to the hero neuron's membrane (S.br.tnfP) while the other two fade (S.br.cytA). */
function bridgeGlyph(S, k) {
  const b = S.br, p = ease(seg(b.cyt, k * .17, k * .17 + .62));
  const sd = 1 - k;                                     // IL-1α on the right, C1q on the left
  const a0 = [BR_MIC[0] + BR_DEBUG.component.microglia[0], BR_MIC[1] + BR_DEBUG.component.microglia[1]];
  const a1 = [ASTRO.x + BR_DEBUG.component.astrocyte[0] + sd * 31, ASTRO.y + BR_DEBUG.component.astrocyte[1] + 78 + Math.abs(sd) * -5];
  const factorOffset = BR_DEBUG.component[BR_TYPES[k]];
  a1[0] += factorOffset[0]; a1[1] += factorOffset[1];
  let x = lerp(a0[0], a1[0], p), y = lerp(a0[1], a1[1], p);
  let al = clamp(p * 5) * (k === 1 ? b.tnfA : b.cytA);
  if (k === 1 && b.tnfP > 0) {
    const q = ease(b.tnfP), tg = [HEROXY[0] - 54, HEROXY[1] - 54], c = [(a1[0] + tg[0]) / 2 + 24, (a1[1] + tg[1]) / 2 - 40], v = 1 - q;      // on to the left side of the pyramidal neuron
    x = v * v * a1[0] + 2 * v * q * c[0] + q * q * tg[0]; y = v * v * a1[1] + 2 * v * q * c[1] + q * q * tg[1];
  }
  return { x, y, a: al, p, grow: k === 1 ? 1 + .5 * ease(b.tnfP || 0) : 1 };      // TNF-α swells a little on its way to the neuron
}
function drawBridge(S, gt) {
  const b = S.br; if (!b || b.astA <= .004 && b.tnfA <= .004 && b.cytA <= .004 && b.rgcA <= .004) return;
  if (b.rgcA > .004) RGC.draw(ctx, { t: gt, a: b.rgcA, d: b.kill, noPuncta: true, texId: (b.kill || 0) > .02 ? 'rgc-dying' : 'rgc' });
  if (b.astA > .004) {
    ctx.save(); ctx.translate(BR_DEBUG.component.astrocyte[0], BR_DEBUG.component.astrocyte[1]);
    ASTRO.draw(ctx, { t: gt, r: b.astR, a: b.astA * (1 - b.astDash), colPal: A1P, texId: (b.astR || 0) > .5 ? 'astro-a1' : 'astro' });       // A1: retracts and turns coral, as in the astrocyte talk
    if (b.astDash > .004) ASTRO.draw(ctx, { t: gt, r: 0, a: b.astA * b.astDash, dashed: true });
    ctx.restore();
  }
  if (b.lip > .004 && b.lip < 1) texEl('lipid', ctx, () => {      // the A1 astrocyte's toxic output (saturated lipids): droplets crossing to the ganglion cell
    const dx = RGC.x - ASTRO.x, dy = RGC.y - ASTRO.y, L = Math.hypot(dx, dy), p0 = [ASTRO.x + dx / L * 26, ASTRO.y + dy / L * 26], p1 = [RGC.x - dx / L * 22, RGC.y - dy / L * 22];
    for (let i = 0; i < 6; i++) {
      const u = clamp(b.lip * 1.75 - i * .15), e = ease(u), a = clamp(u * 6) * clamp((1 - u) * 6); if (a <= .01) continue;
      const x = lerp(p0[0], p1[0], e) - dy / L * Math.sin(e * Math.PI) * (10 + (i % 3) * 5), y = lerp(p0[1], p1[1], e) + dx / L * Math.sin(e * Math.PI) * (10 + (i % 3) * 5) * -1;
      ctx.beginPath(); ctx.arc(x, y, 3.4 - (i % 2) * .7, 0, TAU); ctx.fillStyle = rgb(PC.lps, a); ctx.fill(); ctx.strokeStyle = rgb(mix(PC.lps, [0, 0, 0], .45), a * .7); ctx.lineWidth = .7; ctx.stroke();
    }
  }, (RGC.x + ASTRO.x) / 2, (RGC.y + ASTRO.y) / 2, Math.hypot(RGC.x - ASTRO.x, RGC.y - ASTRO.y) / 2 + 40);
  const sz = 30 / Math.pow(S.cam.z, .8);
  BR_TYPES.forEach((ty, k) => {
    const g = bridgeGlyph(S, k); if (g.a <= .01) return;
    const pulse = k === 1 ? 1 + .06 * Math.sin(gt * 4) : 1;
    glyph(ctx, ty, g.x, g.y, sz * pulse * (g.grow || 1), ty === 'c1q' ? 0 : gt * .3 + k, g.a);
  });
}
const TNF_N = 54, ABO_N = 40;
// medium glyphs: MED.k = their scale in the culture view (≈ the 50 px AβO glyph on the S3 caption panel), MED.dishK = in the dishes
// (unchanged: the dishes already drew them large); MED.every = keep 1 glyph in N, so the field reads less busy. TNF-α still
// fills in proportion to the bar (vehicle ≈ half of AβOs), at 1 glyph per ~3 pg/mL instead of 1 per pg/mL.
const MED = { k: 2.1, dishK: 1.75, every: 3 };
/* AβO placement (S3 onward): laid out in SCREEN space at the S3 whole-coverslip view, then mapped back to world units, so they
   cover the frame evenly, stay clear of the frame edges and of the centred caption panel, and never overlap.
   ?abo=1 / 2: jittered 5×3 grid with the centre (caption) cell empty, two seeds. ?abo=3: random scatter with a minimum spacing.
   ?abo=0: the old hash scatter. */
const ABO_VAR = +(new URLSearchParams(location.search).get('abo') ?? 3);      // 3 = Felix's pick (2026-11-20)
const ABO_HOME = (() => {
  if (!ABO_VAR) return null;
  let st = [0, 1013, 7777, 424242][ABO_VAR] || ABO_VAR * 99991;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const X0 = 110, X1 = W - 110, Y0 = 90, Y1 = H - 110, cap = { x0: 560, x1: 1360, y0: 440, y1: 640 };      // usable frame; caption panel + its padding
  // also clear of the caption's arrows (centre → each bound neuron) and of the bound neurons' cell bodies
  const z0 = CULT_CAM.z, ay0 = CULT_CAM.ay ?? FC.y, scr = (x, y) => [CULT_CAM.ax + (spX(x, 1) - CULT_CAM.x) * z0, ay0 + (y - CULT_CAM.y) * z0];
  const somas = BOUND.map(i => scr(NEURON_AT[i][0], NEURON_AT[i][1] + (i === 3 ? 80 : 0)));
  const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], u = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)); return Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy); };
  const free = (x, y) => !(x > cap.x0 && x < cap.x1 && y > cap.y0 && y < cap.y1) && somas.every(p => Math.hypot(x - p[0], y - p[1]) > 150 && segD(x, y, [W / 2, H / 2], p) > 70);
  const pts = [];
  if (ABO_VAR <= 2) {
    const cw = (X1 - X0) / 5, ch = (Y1 - Y0) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      if (r === 1 && c === 2) continue;
      for (let tries = 0; tries < 200; tries++) { const x = X0 + (c + .5 + (rnd() - .5) * .62) * cw, y = Y0 + (r + .5 + (rnd() - .5) * .62) * ch; if (free(x, y) || tries === 199) { pts.push([x, y]); break; } }
    }
  } else {
    for (let tries = 0; pts.length < 14 && tries < 20000; tries++) {
      const x = X0 + rnd() * (X1 - X0), y = Y0 + rnd() * (Y1 - Y0);
      if (free(x, y) && pts.every(q => Math.hypot(q[0] - x, q[1] - y) > 250)) pts.push([x, y]);
    }
  }
  return pts.map(p => scrToWorld(p[0], p[1]));
})();
// screen → world at the whole-coverslip camera (spread 1): sx = ax + (spX(wx) − cam.x)·z,  sy = ay + (wy − cam.y)·z
function scrToWorld(sx, sy) { const z = CULT_CAM.z, ay = CULT_CAM.ay ?? FC.y, xs = CULT_CAM.x + (sx - CULT_CAM.ax) / z; return [625 + (xs - 625) / (1 + SPREAD), CULT_CAM.y + (sy - ay) / z]; }
function worldToScr(wx, wy) { const z = CULT_CAM.z, ay = CULT_CAM.ay ?? FC.y; return [CULT_CAM.ax + (spX(wx, 1) - CULT_CAM.x) * z, ay + (wy - CULT_CAM.y) * z]; }
/* TNF-α placement (S5 onward), 18 glyphs that fill in order (≈10 at the vehicle level, 18 with AβOs). Each new glyph goes where it
   is farthest from everything already placed and from the AβOs (best-candidate sampling), so the field is even at every fill level.
   Kept clear of the S5 chart panel + caption tag (centre column) and the frame edges.
   ?tnf=1 / 2: even fill, two seeds.  ?tnf=3: loose clouds around the microglia that release it.  ?tnf=0: the old hash scatter.
   Each entry is [wx, wy, microglia index it is released from]. */
const TNF_VAR = +(new URLSearchParams(location.search).get('tnf') ?? 2);      // 2 = Felix's pick (2026-11-20)
const TNF_HOME = (() => {
  if (!TNF_VAR) return null;
  let st = [0, 31337, 271828, 99173][TNF_VAR] || TNF_VAR * 7919;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const X0 = 100, X1 = W - 100, Y0 = 80, Y1 = H - 100, col = { x0: 680, x1: 1240 };      // S5: the chart panel and its tag fill the centre column
  const abo = (ABO_HOME || []).map(p => worldToScr(p[0], p[1])), mic = MIC_AT.map(m => worldToScr(m[0], m[1]));
  const ok = (x, y) => x > X0 && x < X1 && y > Y0 && y < Y1 && !(x > col.x0 && x < col.x1);
  const pts = [];
  for (let n = 0; n < Math.ceil(TNF_N / MED.every); n++) {
    let best = null, bd = -1;
    for (let c = 0; c < 60; c++) {
      let x, y, src;
      if (TNF_VAR === 3) { src = n % 3; const a = rnd() * TAU, r = 90 + Math.sqrt(rnd()) * 230; x = mic[src][0] + Math.cos(a) * r; y = mic[src][1] + Math.sin(a) * r * .85; }
      else { x = X0 + rnd() * (X1 - X0); y = Y0 + rnd() * (Y1 - Y0); }
      if (!ok(x, y)) continue;
      const d = Math.min(1e9, ...pts.map(p => Math.hypot(p[0] - x, p[1] - y)), ...abo.map(p => Math.hypot(p[0] - x, p[1] - y) * 1.25));
      if (d > bd) { bd = d; best = [x, y, src ?? mic.reduce((k, m, i) => Math.hypot(m[0] - x, m[1] - y) < Math.hypot(mic[k][0] - x, mic[k][1] - y) ? i : k, 0)]; }
    }
    if (best) pts.push(best);
  }
  return pts.map(([x, y, m]) => [...scrToWorld(x, y), m]);
})();
// which of the three microglia a TNF-α glyph is released from
const tnfSrc = i => MIC_AT[i % 3];

/* The cells, in world coordinates (the caller has set the transform). P: { vis(x, y, r) culling, lit(i) phospho-PKR per neuron,
   punK puncta size, plain: no bridge staging / ghost pathway } */
function cultureCells(S, gt, P = {}) {
  const b = S.br || {}, lightL = P.plain ? 0 : (b.revL || 0), vis = P.vis || (() => true), lM = P.plain ? 0 : (b.layM || 0), lM0 = P.plain ? 0 : (b.layM0 || 0), lN = P.plain ? 0 : (b.layN || 0), punK = P.punK || 1, sp = P.sp ?? (S.spread || 0);
  const micro = which => () => {
  MICG.forEach((m, i) => {
    if (which && !which(i)) return;
    const lm = i ? lM : lM0, debug = i === 1 ? BR_DEBUG.component.microglia : [0, 0], ox = MIC_OFF[i][0] * lm + (spX(m.x, sp) - m.x) + debug[0] * lm, oy = MIC_OFF[i][1] * lm + debug[1] * lm; if (!vis(m.x + ox, m.y + oy, 70)) return;
    ctx.save(); ctx.translate(ox, oy); lite(() => m.draw(ctx, { t: gt, r: S.micro * .55, colR: 0, lightL: i === 1 ? 0 : lightL, texId: S.micro * .55 > .25 ? 'micro-act' : 'micro' })); ctx.restore();
  });
  };
  const bl0 = P.plain ? 0 : (b.blur || 0);
  if (bl0 > .02) micro(i => i === 1)();                  // bridge: only the microglia that secretes (1) stays sharp; the other two are blurred with the neurons, below
  else if (!(!P.plain && (S.blurUnbound || 0) > .02)) micro()();          // (when the unbound cells are out of focus the microglia are drawn with them, below)
  const SIDE = [0, 3, 2, 5, 8];                          // left and right columns
  const neurons = which => () => {
  NEU.forEach((n, i) => {
      if (which && !which(i)) return;
      const off = NEU_OFF[i], ox = (off ? off[0] * lN : 0) + (spX(n.x, sp) - n.x), oy = (off ? off[1] * lN : 0) + (i === 3 ? (S.anomNeuron3Y || 0) : 0);
      let a = 1; if (!P.plain) { if (NEU_HID.includes(i)) a = 1 - lN; if (i === 1) a = 1 - (b.rgc || 0); }
      if (a <= .004 || !vis(n.x + ox, n.y + oy, 240)) return;
      const lit = P.lit ? P.lit(i, n) : S.ppkr;
      ctx.save(); ctx.translate(ox, oy);
      n.draw(ctx, { t: gt, a, colR: lit, noPuncta: true, lightL, texId: lit > .5 ? 'neuron-lit' : 'neuron', sepId: 'puncta', rimW: i === HERO && !P.plain && S.cam.track > 0 ? heroRim(S.cam.z) : undefined, after: (c, strands, R0) => {
        if (BOUND.includes(i) && S.aboBind > 0) {                        // oligomers bound along the dendrites (a subset of neurons only)
          texSeparate(c, c => {                                          // their own object for the texture (texture.js), not part of the cell's outline
            for (const q of n.dendPoints(strands, 7.5, 3)) { const va = clamp((S.aboBind * 1.25 - q[4]) / .25); if (va <= 0) continue; c.beginPath(); c.arc(q[0] + q[2] * (q[5] + 1.2), q[1] + q[3] * (q[5] + 1.2), 1.9 * punK * eOut(va), 0, TAU); c.fillStyle = rgb(PC.abo, va); c.fill(); }
          });
        }
        if (i === HERO && S.ghost > .004 && !P.plain) {                  // the pathway, unlit and unlabelled, inside the cell
          c.save(); c.globalAlpha *= S.ghost; const Q = NP.off;
          rod(c, R0 * .62, -R0 * .86, R0 * .78, -R0 * 1.08, 1.5, Q, .4);                                   // receptor in the membrane
          dom(c, R0 * .56, -R0 * .42, 2.3, 1.9, .3, Q, .4); dom(c, -R0 * .66, -R0 * .28, 2.5, 2, -.3, Q, .4); dom(c, -R0 * .12, -R0 * .74, 2.3, 1.9, 0, Q, .4); dom(c, R0 * .5, R0 * .5, 2.3, 1.9, .5, Q, .4);
          c.restore();
        }
      } });
      ctx.restore();
    });
  
  };
  const bl = P.plain ? 0 : (b.blur || 0);
  const fo = P.plain ? 0 : (S.focus || 0);               // scene 4b verdict: the outer columns drop out of focus so the eye stays on the centre
  const ub = P.plain ? 0 : (S.blurUnbound || 0);         // scene 2a: neurons that carry no oligomer drop out of focus
  const side = i => SIDE.includes(i), bound = i => BOUND.includes(i);
  if (bl > .02) blurLayer(bl * 7, lerp(1, .55, bl), () => { micro(i => i !== 1)(); neurons()(); });
  else if (ub > .02) { const nb = neurons(i => !bound(i)); blurLayer(ub * 5.5, 1, () => { micro()(); nb(); }); lite(neurons(bound)); }      // blur only, no darkening (the dimming read as choppy)
  else if (fo > .02) { blurLayer(fo * 4.5, lerp(1, .6, fo), neurons(side)); lite(neurons(i => !side(i))); }
  else lite(neurons());
}
// Cells are drawn without clay's drop-shadow pass where it cannot be seen (black page) or does not pay (the small cells in the
// dishes): that pass is most of a frame's cost.
const lite = fn => fn();        // every cell gets full clay (shadow = the bevel on its rim) outside the dishes
/* Draw fn() out of focus: into an offscreen layer (same transform, clay volume kept), then onto the stage through a blur. */
let BLURL = null;
function blurLayer(px, dim, fn) {
  const main = ctx, cv2 = main.canvas; if (!BLURL) BLURL = document.createElement('canvas');
  if (BLURL.width !== cv2.width || BLURL.height !== cv2.height) { BLURL.width = cv2.width; BLURL.height = cv2.height; }
  const l = BLURL.getContext('2d'); l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, BLURL.width, BLURL.height); l.setTransform(main.getTransform());
  ctx = l; try { withClay(l, !THEME.light, fn); } finally { ctx = main; }      // full clay, as on the sharp cells: no rim snap when a cell goes out of focus
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha *= dim; drawFiltered(main, `blur(${(px * cv2.width / W).toFixed(1)}px)`, BLURL, 0, 0, BLURL.width, BLURL.height, 0, 0, BLURL.width, BLURL.height); main.restore();
}
/* Draw fn() and fade it as one picture (alpha a): into an offscreen layer at full strength (clay and textures as usual), then onto the stage. */
let FADEL = [], FADE_D = 0;      // one offscreen canvas per nesting depth, so a group fade can sit inside another
function fadeLayer(a, fn) {
  if (a <= .004) return; if (a >= .999) return fn();
  const main = ctx, cv2 = main.canvas, d = FADE_D; if (!FADEL[d]) FADEL[d] = document.createElement('canvas');
  const L = FADEL[d]; if (L.width !== cv2.width || L.height !== cv2.height) { L.width = cv2.width; L.height = cv2.height; }
  const l = L.getContext('2d'); l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, L.width, L.height); l.setTransform(main.getTransform());
  ctx = l; FADE_D++; try { withClay(l, !THEME.light, fn); } finally { ctx = main; FADE_D--; }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha *= a; main.drawImage(L, 0, 0); main.restore();
}
/* The medium: AβOs, TNF-α (neutralized where infliximab is present) and the antibody itself.
   P: { molK glyph scale, keep 0..1 share of glyphs kept (dishes are smaller than the field), inflix: null = split-screen rule
   (right of SPLIT_X only) or 0..1 = this whole dish, drop: AβOs appear in place instead of raining in from the top } */
function cultureMedium(S, gt, P = {}) {
  const k = P.molK || MED.k, kept = i => i % MED.every === 0 ? 1 : 0;      // one sparse set of glyphs everywhere (culture and dishes), so the zoom out to the dishes keeps every glyph it shows
  const inf = P.inflix == null ? S.inflix : P.inflix, all = P.inflix != null, sp = P.sp ?? (S.spread || 0);
  if (S.aboMed > 0) swarm('abo', ABO_HOME ? ABO_HOME.length : ABO_N, 11, gt, { home: ABO_HOME ? i => ABO_HOME[i] : null, vis: (i, h) => clamp((S.aboMed * 1.3 - h) / .3) * (ABO_HOME ? 1 : kept(i, ABO_N)), origin: P.drop ? null : (i, bx, by) => [bx + 30, WORLD.y - 40], scale: k, sp, a: S.swarmA ?? 1 });
  if (S.tnfMed > 0 && TNF_HOME) {      // glyph j stands for the old index 3j: same fill timing and neutralization pick as before
    const ix = j => j * MED.every;
    swarm('tnf', TNF_HOME.length, 37, gt, {
      home: j => TNF_HOME[j], vis: j => clamp((S.tnfMed * TNF_N - ix(j)) / 1.6), origin: j => MIC_AT[TNF_HOME[j][2]], scale: k, sp,
      type: (j, bx) => (inf > 0 && (all || bx > SPLIT_X) && hash(ix(j) * 3.3) < inf * 1.15) ? 'tnfb' : 'tnf', a: S.swarmA ?? 1,
    });
  } else if (S.tnfMed > 0) swarm('tnf', TNF_N, 37, gt, {
    vis: (i) => clamp((S.tnfMed * TNF_N - i) / 1.6) * kept(i, TNF_N), origin: i => tnfSrc(i), scale: k, sp,
    type: (i, bx) => (inf > 0 && (all || bx > SPLIT_X) && hash(i * 3.3) < inf * 1.15) ? 'tnfb' : 'tnf', a: S.swarmA ?? 1,
  });
  if (inf > 0) swarm('ab', 16, 71, gt, { vis: (i, h, bx) => (all || P.inflix == null) ? clamp((inf * 1.3 - h) / .3) : 0, origin: P.drop ? null : (i, bx, by) => [bx, WORLD.y - 40], scale: k / 1.05, sp, a: 1 });
}

function drawCulture(S, gt) {
  const a = S.cultA; if (a <= .004) return;
  { const C = S.conf; if (C && C.a >= .999 && (C.cover ?? 1) >= .999 && !C.own) return; }      // the confocal view's opaque field covers it all: nothing here would show
  if (S.dish && S.dish.on) { ctx.save(); ctx.globalAlpha *= a; drawDishes(S, gt); ctx.restore(); return; }
  const z = S.cam.z, F = LAY.field;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.save(); fieldClip(2); ctx.clip();
  worldXf(S);
  const R = Math.hypot(W, H) * .5 / z;                                 // generous culling circle (the view may be rotated)
  const mid = [S.cam.x + (W / 2 - (S.cam.ax ?? FC.x)) / z, S.cam.y + (H / 2 - (S.cam.ay ?? FC.y)) / z];
  const vis = S.cam.rot ? () => true : (x, y, r) => Math.abs(x - mid[0]) < W / 2 / z + r && Math.abs(y - mid[1]) < BAND.h / 2 / z + r + 60 / z;
  cultureCells(S, gt, { vis, lit: (i, n) => Math.max(S.ppkr, BOUND.includes(i) ? S.ppkrB || 0 : 0) * (1 - S.inflix * (n.x > SPLIT_X ? 1 : 0)) });      // ppkrB: the bound neurons alone (S4A)
  cultureMedium(S, gt);
  drawTissueDiagram(S, gt);
  drawBridge(S, gt);
  ctx.restore();
  bandFades(S.boardA > .004 ? 0 : 1);                      // once the board is fading in over the cells it draws the one soft edge for both
  // split-screen furniture (screen space)
  if (S.split > .004) {
    const sx = toScreen(S, spX(SPLIT_X, S.spread || 0), 0)[0];
    ctx.save(); ctx.globalAlpha *= S.split; ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.strokeStyle = rgb(COL.ink, .7); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, F.y + 70); ctx.lineTo(sx, F.y + lerp(70, F.h - 14, eOut(S.split))); ctx.stroke(); ctx.restore();
    pill('AβOs', (F.x + sx) / 2, F.y + 36, { a: S.split, size: 22, col: PC.abo, tcol: [255, 255, 255] });
    pill('Infliximab + AβOs', (sx + 1450) / 2, F.y + 36, { a: S.split, size: 22 });
  }
  ctx.restore();
}

/* scene 4, experimental variant: the same culture in two petri dishes */
/* Dish hardware copied from physio_render/src/engines/lab.js (drawDish, drawDishRim, tiltDish: "Petri dish, tilting"), with
   two additions: hw fades the glassware in (the scene opens as the plain top-down field and an iris closes into the dish), and
   clipR is the iris radius. The glass is drawn outside clay (it is all gradients and thin rims); the cells inside keep it. */
function drawDish(x, y, r, o = {}) {
  const a = o.a ?? 1; if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a;
  const sh = ctx.createRadialGradient(x, y + 8, r * .92, x, y + 8, r * 1.13);
  sh.addColorStop(0, shade(.55)); sh.addColorStop(1, shade(0));
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y + 8, r * 1.13, 0, TAU); ctx.fill();
  const tint = o.tint || UI.dish;
  const g = ctx.createRadialGradient(x - r * .25, y - r * .3, r * .05, x, y, r);
  g.addColorStop(0, rgb(mix(tint, [255, 255, 255], UI.dishHi))); g.addColorStop(1, rgb(mix(tint, [0, 0, 0], UI.dishLo)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawDishRim(x, y, r, o = {}) {
  const a = o.a ?? 1; if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a;
  const ra = UI.rimA, gl = UI.glare;
  ctx.strokeStyle = rgb(UI.rim, Math.min(1, .36 * ra)); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgb(UI.rim, .13 * ra); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r - 7, 0, TAU); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${.16 * gl})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r - 3.5, 3.6, 4.3); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${.07 * gl})`; ctx.beginPath(); ctx.arc(x, y, r - 3.5, .5, .9); ctx.stroke();
  ctx.restore();
}
const TILT = .9;                          // radians at tilt = 1 (about 52 degrees)
const tiltK = tilt => Math.cos(TILT * tilt), tiltWall = (r, tilt) => r * .34 * Math.sin(TILT * tilt);
function tiltDish(x, y, r, tilt, hw, tint, content, clipR) {
  const ky = tiltK(tilt), Hw = tiltWall(r, tilt), ry = r * ky, fy = y + Hw, b = ease(seg(tilt, 0, .3));
  const ri = r - 7, rin = ri * ky, light = THEME.light;
  if (hw > .004) claySuspend(() => {
    ctx.save(); ctx.globalAlpha *= hw;
    if (b < 1) { ctx.save(); ctx.globalAlpha *= 1 - b; ctx.translate(x, fy); ctx.scale(1, ky); drawDish(0, 0, r, { tint }); ctx.restore(); }   // the flat dish while the tilt is just starting
    if (b > 0) {
      ctx.save(); ctx.globalAlpha *= b;
      const sh = ctx.createRadialGradient(x, fy + 10, ry * .9, x, fy + 10, ry * 1.2);           // shadow on the table
      sh.addColorStop(0, shade(.45)); sh.addColorStop(1, shade(0));
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x, fy + 10, r * 1.2, ry * 1.2, 0, 0, TAU); ctx.fill();
      // far inside wall: between the rim's back arc and the floor's back edge
      const bw = ctx.createLinearGradient(0, y - ry, 0, fy);
      bw.addColorStop(0, rgb(mix(tint, [110, 126, 142], .22), .9)); bw.addColorStop(1, rgb(mix(tint, [255, 255, 255], .25), .9));
      ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, Math.PI, TAU, false); ctx.lineTo(x + ri, fy); ctx.ellipse(x, fy, ri, rin, 0, TAU, Math.PI, true); ctx.closePath();
      ctx.fillStyle = bw; ctx.fill();
      // floor with the medium on it
      ctx.save(); ctx.translate(x, fy); ctx.scale(1, ky);
      const g = ctx.createRadialGradient(-ri * .25, -ri * .3, ri * .05, 0, 0, ri);
      g.addColorStop(0, rgb(mix(tint, [255, 255, 255], UI.dishHi))); g.addColorStop(1, rgb(mix(tint, [0, 0, 0], UI.dishLo)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ri, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(UI.rim, .4 * UI.rimA); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
  });
  // cells: on the floor, squashed with the view
  ctx.save(); ctx.translate(x, fy); ctx.scale(1, ky); ctx.beginPath(); ctx.arc(0, 0, clipR ?? r - 8, 0, TAU); ctx.clip(); content(); ctx.restore();
  if (hw > .004) claySuspend(() => {
    ctx.save(); ctx.globalAlpha *= hw;
    if (b > 0) {
      ctx.save(); ctx.globalAlpha *= b;
      // front glass wall, with the medium showing through it
      const fw = ctx.createLinearGradient(0, y + ry, 0, fy + ry);
      fw.addColorStop(0, rgb(mix(tint, [255, 255, 255], .5), .3)); fw.addColorStop(1, rgb(mix(tint, [90, 130, 170], .3), .5));
      const wall = () => { ctx.moveTo(x - r, y); ctx.lineTo(x - r, fy); ctx.ellipse(x, fy, r, ry, 0, Math.PI, 0, true); ctx.lineTo(x + r, y); };
      ctx.beginPath(); wall(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI, false); ctx.closePath(); ctx.fillStyle = fw; ctx.fill();
      ctx.strokeStyle = rgb(UI.rim, Math.min(1, .7 * UI.rimA)); ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); wall(); ctx.stroke();
      // the rim: outline, pale band, inner line
      ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU);
      ctx.strokeStyle = rgb(UI.rim, Math.min(1, .75 * UI.rimA)); ctx.lineWidth = 12; ctx.stroke();
      ctx.strokeStyle = light ? 'rgba(255,255,255,.96)' : 'rgba(210,225,238,.28)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, r - 8, ry * (r - 8) / r, 0, 0, TAU); ctx.strokeStyle = rgb(UI.rim, .5 * UI.rimA); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    if (b < 1) { ctx.save(); ctx.globalAlpha *= 1 - b; ctx.translate(x, fy); ctx.scale(1, ky); drawDishRim(0, 0, r); ctx.restore(); }
    ctx.restore();
  });
}
/* S.dish = { on, iris 0..1 (field → one round dish), sep 0..1 (one dish → two), tilt 0..1, lab 0..1 (name pills),
              inf 0..1 (infliximab in the right dish), rA (right dish alpha), home: x where the single dish sits }
   At iris 0 this draws exactly what drawCulture draws (same camera, no glass), so the scene enters and leaves dish mode
   without a jump. Both dishes hold the same nine neurons; the left one follows S, the right one adds infliximab.
   Going in, the single dish forms midway and divides evenly; coming out (scene 4b) home = the right dish, so the left dish
   slides over onto it and the camera pushes back in from near the middle of the stage. */
const DISH = { r: 332, xL: 446, xR: 1474, yc: 500, z: .67, cam: [625, 578] };      // AβOs dish on the left, infliximab dish far right: the middle is for the panels
DISH.mid = W / 2;                                    // the single dish forms, divides and re-forms in the middle of the stage
const dishX = (S, j) => { const D = S.dish; return lerp(S.cam.ax ?? FC.x, lerp(D.home ?? DISH.mid, j ? DISH.xR : DISH.xL, D.sep), ease(D.iris)); };
const dishRimY = S => lerp(S.cam.ay ?? FC.y, DISH.yc, ease(S.dish.iris)) - tiltWall(DISH.r, S.dish.tilt) / 2 - DISH.r * tiltK(S.dish.tilt);   // top of the rim, for labels
function drawDishes(S, gt) {
  const D = S.dish, e = ease(D.iris), hw = ease(seg(D.iris, 0, .55));
  const z = Math.exp(lerp(Math.log(S.cam.z), Math.log(DISH.z), e)), cx = lerp(S.cam.x, DISH.cam[0], e), cy = lerp(S.cam.y, DISH.cam[1], e);
  const yc = lerp(S.cam.ay ?? FC.y, DISH.yc, e);
  // the dish is a real object in the culture: far too wide to see at first, it tightens around the cells as the camera pulls back, so its rim
  // glides in from outside the frame and the glass and the clip are always the same circle
  const r = lerp(1500, DISH.r / DISH.z, e) * z, clipR = r - 8;
  const molK = lerp(MED.k, MED.dishK, e), punK = lerp(1, 1.5, e), sp = (S.spread || 0) * (1 - e);      // the glyphs ease from the culture size to the dish size with the zoom
  ctx.save(); fieldClip(2); ctx.clip();
  for (const j of [1, 0]) {                                           // right first: the left dish is the one on top
    if (j && (D.sep <= .004 || D.rA <= .004)) continue;
    ctx.save(); if (j) ctx.globalAlpha *= D.rA;
    tiltDish(dishX(S, j), yc - tiltWall(r, D.tilt) / 2, r, D.tilt, hw, UI.dish, () => {
      ctx.scale(z, z); ctx.translate(-cx, -cy);
      (e > .6 ? clayLite : lite)(() => cultureCells(S, gt, { plain: true, punK, sp, lit: () => S.ppkr * (j ? 1 - D.inf : 1) }));      // small cells in the dishes: shadow pass skipped (most of a frame's cost)
      cultureMedium(S, gt, { molK, sp, drop: e > .5, inflix: j ? D.inf : 0 });
    }, clipR);
    ctx.restore();
  }
  ctx.restore();
  bandFades(1 - hw);
  if (D.lab > .004) {
    const y = dishRimY(S) - 52;
    pill('AβOs', dishX(S, 0), y, { a: D.lab, size: 23, col: PC.abo, tcol: [255, 255, 255] });
    pill('Infliximab + AβOs', dishX(S, 1), y, { a: D.lab, size: 23 });
  }
}
// Scene 4 → 5: the model drawn on the cells themselves. Direct edge AβO → neuron (struck); relay AβO → TNF-α → neuron (solid).
function drawTissueDiagram(S, gt) {
  const T = S.tis; if (!T || T.a <= .004) return;
  const k = 1 / Math.sqrt(S.cam.z);                       // keep marks from ballooning as the camera pushes in
  ctx.save(); ctx.globalAlpha *= T.a;
  const sp = S.spread || 0, T_ABO = [spX(T_ABO0[0], sp), T_ABO0[1]], T_TNF = [spX(T_TNF0[0], sp), T_TNF0[1]];
  const hero = [HEROXY[0] - 2, HEROXY[1] - 4], mic = mXY(S, 0);
  const [d0, d1] = between(T_ABO, 30, hero, 24), [r0, r1] = between(T_ABO, 30, T_TNF, 26), [n0, n1] = between(T_TNF, 24, hero, 24);
  drawEdge(d0, d1, T.dir, { w: .8 * k, bend: 34, strikeAt: .52 });
  drawEdge(r0, r1, T.relay, { w: .8 * k, bend: -150, gt, pulse: T.relay.solid >= 1 ? 1 : 0 });
  drawEdge(n0, n1, T.tnfN, { w: .8 * k, bend: -10, gt, pulse: T.tnfN.solid >= 1 ? 1 : 0, ph: .4 });
  ctx.save(); ctx.translate(T_ABO[0], T_ABO[1]); gABO(ctx, 44, 1); ctx.restore();
  ctx.save(); ctx.translate(T_TNF[0], T_TNF[1]); gTNF(ctx, 40, 1); ctx.restore();
  ctx.restore();
  const la = T.a * (T.lab ?? 1);
  txt('AβOs', T_ABO[0], T_ABO[1] + 66 * k, { size: 30 * k, w: 600, col: COL.abo, align: 'center', a: la, halo: 6 * k });
  txt('TNF-α', T_TNF[0] + 38, T_TNF[1] + 10, { size: 30 * k, w: 600, col: COL.tnf, a: la, halo: 6 * k });
  txt('microglia?', mic[0] + 36, mic[1] - 34, { size: 26 * k, w: 500, it: true, col: COL.dim, a: la * (T.relay.show || 0), halo: 6 * k });
}

/* confocal view: the same cells, redrawn as the three-channel immunofluorescence of Fig. 1H */
const FL = new Proxy({}, { get: (_, p) => PALETTES.dark.fl[p] });     // confocal channel colours (theme.js; editable on gallery.html). The stage stays black in both themes.
function drawConfocal(S, gt) {
  const C = S.conf; if (!C || C.a <= .004) return;
  const F = LAY.field, z = S.cam.z;
  claySuspend(() => {
    ctx.save(); ctx.globalAlpha *= C.a;
    // full-bleed black band; edges fade to the page in dark, stay crisp in light. C.cover (0..1, default 1) lets the cells
    // underneath show through as a dimming ghost while the stains come up, so the view morphs instead of cutting to black
    fieldClip(); ctx.save(); ctx.globalAlpha *= C.cover ?? 1; ctx.fillStyle = 'rgb(3,5,8)'; ctx.fill(); ctx.restore();
    ctx.save(); fieldClip(2); ctx.clip();
    worldXf(S);
    if (!drawFluoLook(S, gt, C)) { ctx.globalCompositeOperation = 'lighter'; NEU.forEach((n, i) => {
      ctx.save(); ctx.translate(spX(n.x, S.spread || 0) - n.x, i === 3 ? (S.anomNeuron3Y || 0) : 0);
      const lvl = .16 + .84 * S.ppkr;                                   // phospho-PKR signal: present in every neuron
      if (C.g > 0) {
        ctx.save(); ctx.shadowColor = rgb(FL.green, .9); ctx.shadowBlur = 10;
        n.draw(ctx, { t: gt, fluo: { col: FL.green, a: C.g * lvl * .42, somaA: C.g * lvl * .5 }, noPuncta: true }); ctx.restore();
      }
      n.draw(ctx, { t: gt, fluo: { col: FL.blue, a: 0, nuc: FL.blue, nucA: .85 * C.b }, noPuncta: true, after: (c, strands, R0) => {
        if (!BOUND.includes(i) || C.r <= 0) return;
        c.save(); c.shadowColor = rgb(FL.red, 1); c.shadowBlur = 5;
        for (const q of n.dendPoints(strands, 7.5, 3)) { c.beginPath(); c.arc(q[0] + q[2] * (q[5] + 1.2), q[1] + q[3] * (q[5] + 1.2), 1.7, 0, TAU); c.fillStyle = rgb(FL.red, C.r * (.55 + .45 * q[4])); c.fill(); }
        c.beginPath(); addSoma(c, R0, () => 1, 1, 0); c.fillStyle = rgb(FL.red, C.r * .5); c.fill();
        c.restore();
      } });
      ctx.restore();
    }); }
    ctx.restore();
    // channel names, as on the figure (centred on the stage)
    const ly = FULL ? TAG_BOT : F.y + F.h - 34, ca = Math.max(C.r, C.g, C.b) * (C.lab ?? 1);
    if (!C.own) glassTag('AβOs   pPKR   DAPI', W / 2, ly, { size: 22, w: 600, a: ca, parts: [{ text: 'AβOs', col: FL.red }, { text: '   ' }, { text: 'pPKR', col: FL.green }, { text: '   ' }, { text: 'DAPI', col: [120, 150, 255] }] });
    // an empty frosted panel, 2:1, dead centre: a stage for whatever is animated over it later
    if (C.box > .004 && !C.own) { const bw = 1280, bh = 760, cy = FULL ? H / 2 : 512, e = lerp(.97, 1, eOut(C.box)); glassPanel(W / 2 - bw * e / 2, cy - bh * e / 2, bw * e, bh * e, 14, C.box); }
    ctx.restore();
  });
}
