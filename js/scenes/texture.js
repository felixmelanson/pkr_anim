'use strict';
/* Cell textures. Each element of the animation (cells, medium glyphs, pathway molecules) is drawn through its own look,
   chosen on the elements page (gallery.html) and saved in look/*.md → js/look.js: see texEl. Text, charts, panels and
   glass are never textured. Looks re-shade an element's pixels after it is drawn (clay included). ?tex=N still pushes
   one look over a whole frame, for comparison only.

   Glow edges: PowerPoint's "Glow Edges" (transparency 40, smoothness 8), fitted against testing/pptx-reference.png, which is
   PowerPoint's output for testing/S1_first_frame_transparent_3840x2160.png (same frame, pixel aligned). What it does:
     - output = 0.4 × original + 0.6 × an edge layer ("transparency 40"); the alpha of the PNG is kept exactly
     - the edge layer is black wherever the picture is flat, and a thin line wherever colour changes, soft ramps included:
       edges are found on the slightly smoothed raw colour, then thinned to one pixel (non-maximum suppression, as in Canny).
       That is why the soft ridges of the astrocyte and the rim of each nucleus come out as crisp lines.
     - the line takes the cell's own colour at that edge, pushed more saturated (pink edges come out magenta)
   Lines are computed on the raw (unpremultiplied) colour, like PowerPoint: on the lit side of a cell the colour fades out
   with the alpha, so the line lands on near-transparent pixels and barely shows; on the shadow side it drops to black where
   the picture is still opaque, so the line is bright. That one-sidedness is the "lit glass" feel.
   Out-of-focus cells keep their soft alpha (PowerPoint turned them into solid blobs; that part is deliberately not copied).
   The default look ("rim") is measured edge by edge instead: see rimEdges at the end of the file.
   URL overrides for any look: ?texb= share of the original, ?texk= line gain, ?texsat= line saturation,
   ?texthr= weakest edge that draws, ?texsm= smoothing (passes at 4K), ?texsoft= line softening px. */
const GE_BASE = { mode: 'both', mix: .4, k: 5, sat: 2, thr: 6, sm: 1, soft: .3, rimK: 1.5, rimSat: 2.2, rimW: 1, rimL0: 25 };
const TEX_VARIANTS = [
  { name: 'Clay' },
  { name: 'Glow edges', p: {} },                                              // measured rim + the inner ridge lines
  { name: 'GE rim only', p: { mode: 'rim' } },                                // just the measured outline bevel
  { name: 'GE rim only +', p: { mode: 'rim', rimW: 2 } },                     // same, rim 2× thicker
  { name: 'GE rim only ++', p: { mode: 'rim', rimW: 3 } },                    // same, rim 3× thicker
  { name: 'GE rim soft', p: { rimK: 1.1, rimSat: 1.8 } },                     // calmer rim
  { name: 'GE rim wide', p: { rimW: 1.5 } },                                  // the bright band a little wider
  { name: 'GE vivid', p: { mode: 'lines', sat: 2.3, k: 5, thr: 12, soft: .4 } },   // previous version, for comparison
];
const TEX_LOOKS = TEX_VARIANTS.map(v => v.name);
const texIdx = v => v == null ? 0 : typeof v === 'number' ? clamp(v | 0, 0, TEX_LOOKS.length - 1) : Math.max(0, TEX_LOOKS.indexOf(v));
// whole-frame look: debugging only now (?tex=N); the scenes use each element's own look instead (texEl)
const TEX_LOOK = (() => { const q = new URLSearchParams(location.search).get('tex'); return q != null ? texIdx(+q) : 0; })();
const texActive = k => TEX_LOOK > 0 && !!STEPS[k];
const TEX_URL = (() => {
  const q = new URLSearchParams(location.search), o = {};
  for (const [k, n] of [['texb', 'mix'], ['texk', 'k'], ['texsat', 'sat'], ['texthr', 'thr'], ['texsm', 'sm'], ['texsoft', 'soft'], ['texrk', 'rimK'], ['texrsat', 'rimSat'], ['texrw', 'rimW'], ['texrl', 'rimL0']]) if (q.get(k) != null) o[n] = +q.get(k);
  return o;
})();
/* Each element's look in the scenes: the project look (look/*.md → js/look.js) under what the elements page has saved
   in this browser (its live previews). Read once at load; reload the animation after changing something there.
   ?eltex=0 turns element textures off. */
const TEX_EL = (() => {
  const out = {}, base = (typeof LOOK !== 'undefined' && LOOK.elements) || {};
  let local = {}; if (!window.PROJECT_LOOK_ONLY) try { local = JSON.parse(localStorage.getItem('pkr.gallery.v1')) || {}; } catch (e) { }
  for (const id of new Set([...Object.keys(base), ...Object.keys(local)])) { const t = (local[id] && local[id].tex != null) ? local[id].tex : base[id] && base[id].tex; const k = texIdx(t); if (k > 0) out[id] = k; }
  return out;
})();
let TEX_EL_ON = new URLSearchParams(location.search).get('eltex') !== '0';      // the elements page turns this off: it applies looks itself
// live viewer: textures cost ~0.1-0.7 s a frame in the busy culture scenes. They are always on; T in the viewer drops them
// during playback for speed (app.js sets TEX_SKIP). Paused, scrubbing and offline renders always show them.
let TEX_SKIP = false;
const texElLook = id => TEX_EL_ON && !TEX_SKIP ? (TEX_EL[id] || 0) : 0;

const TXL = {};
const TEX_GPU = () => typeof TEXGL !== 'undefined' && !!TEXGL;      // texgl.js: the shader version of the looks (live viewer)
// scratch canvases only ever grow (elements come in every size, every frame); the area in use is always (0,0)–(w,h)
function texCanvas(name, w, h) {
  let L = TXL[name]; if (!L) L = TXL[name] = document.createElement('canvas');
  if (L.width < w || L.height < h) { L.width = Math.max(L.width, Math.ceil(w / 64) * 64); L.height = Math.max(L.height, Math.ceil(h / 64) * 64); }
  const c = L.getContext('2d', { willReadFrequently: !TEX_GPU() }); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';      // GPU path: nothing is read back, so the canvas stays on the graphics card
  c.clearRect(0, 0, L.width, L.height); return c;
}

/* Draw fn(c) through a look onto o.main (default: the global ctx).
   o.look: index into TEX_VARIANTS (default: the whole-frame ?tex look); o.px: device pixels per drawing unit (default:
   the stage, canvas width / 1920); o.rect: [x0, y0, x1, y1] in device pixels of o.main, the only area worked on (default:
   all of it); o.sepLook: the look of things drawn through texSeparate (default: o.look).
   The result lands on o.main through its own clip, alpha and blend mode, so it can stand in for drawing fn there directly. */
let TEX_DEPTH = 0;
function texPaint(fn, o = {}) {
  const main = o.main || ctx, cvm = main.canvas;
  let [x0, y0, x1, y1] = o.rect || [0, 0, cvm.width, cvm.height];
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(cvm.width, Math.ceil(x1)); y1 = Math.min(cvm.height, Math.ceil(y1));
  if (x1 - x0 < 1 || y1 - y0 < 1) return;                              // off the canvas: nothing to see
  // always worked at about 4K: below that the area is drawn at 2× and the result scaled down (1 px lines stair-step otherwise)
  const px0 = o.px ?? cvm.width / W, ss = px0 < 1.5 ? 2 : 1, px = px0 * ss, rw = x1 - x0, rh = y1 - y0, w = Math.ceil(rw * ss), h = Math.ceil(rh * ss);
  const lc = texCanvas('src', w, h), mt = main.getTransform();
  lc.setTransform(mt.a * ss, mt.b * ss, mt.c * ss, mt.d * ss, (mt.e - x0) * ss, (mt.f - y0) * ss);
  // text (labels) skips the effect: every fillText / strokeText is redrawn, with the same state, on a separate layer laid on top
  const tc = texCanvas('text', w, h), TS = ['font', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineJoin', 'miterLimit', 'globalAlpha', 'globalCompositeOperation', 'textAlign', 'textBaseline', 'direction', 'letterSpacing', 'fontKerning', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'filter'];
  const viaText = op => function (...a) { for (const k of TS) if (k in tc) tc[k] = this[k]; tc.setTransform(this.getTransform()); tc[op](...a); };
  lc.fillText = viaText('fillText'); lc.strokeText = viaText('strokeText');
  const clayOn = Object.prototype.hasOwnProperty.call(main, 'fill');  // the caller is inside withClay: draw the layer in clay too
  TEX_SEP = { sep: { c: texCanvas('sep', w, h), used: false }, nuc: { c: texCanvas('nsep', w, h), used: false } };   // things drawn through texSeparate() land here
  const prev = ctx; ctx = lc; TEX_DEPTH++;
  try { if (clayOn) withClay(lc, !THEME.light, () => fn(lc)); else fn(lc); } finally { ctx = prev; TEX_DEPTH--; delete lc.fillText; delete lc.strokeText; }
  const sep = TEX_SEP.sep.used, nuc = TEX_SEP.nuc.used; TEX_SEP = null;
  const look = o.look ?? TEX_LOOK, P = Object.assign({}, GE_BASE, TEX_VARIANTS[look].p, TEX_URL);
  const Ps = o.sepLook != null ? Object.assign({}, GE_BASE, TEX_VARIANTS[o.sepLook].p, TEX_URL) : P;
  const gpu = TEX_GPU();
  if (!gpu && look > 0) texLayer(TXL.src, w, h, 'body', 'line', P, px);
  if (!gpu && sep && (o.sepLook ?? look) > 0) texLayer(TXL.sep, w, h, 'sbody', 'sline', Ps, px);   // the separate layer gets its own pass: its outline, its colours
  const out = texCanvas('full', w, h);
  if (look > 0) (gpu ? composeGL(out, TXL.src, P, px, w, h) : compose(out, 'body', 'line', P, px, w, h)); else out.drawImage(TXL.src, 0, 0, w, h, 0, 0, w, h);
  if (nuc) {                                                         // nuclei: plain clay, dimmed a little toward the textured body
    drawFiltered(out, look > 0 ? `brightness(${Math.min(1, P.mix * 1.6).toFixed(2)})` : 'none', TXL.nsep, 0, 0, w, h, 0, 0, w, h);
  }
  if (sep) { if ((o.sepLook ?? look) > 0) (gpu ? composeGL(out, TXL.sep, Ps, px, w, h) : compose(out, 'sbody', 'sline', Ps, px, w, h)); else out.drawImage(TXL.sep, 0, 0, w, h, 0, 0, w, h); }   // laid over the cells
  out.drawImage(TXL.text, 0, 0, w, h, 0, 0, w, h);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.imageSmoothingQuality = 'high';    // keeps main's clip, alpha and blend mode
  claySuspend(() => main.drawImage(TXL.full, 0, 0, w, h, x0, y0, rw, rh));
  main.restore();
  return { w, h, x0, y0, rw, rh };
}
// run the look on one layer: its body (the original at 40 %) and its edge layer, into two named canvases
function texLayer(src, w, h, bn, ln, P, px) {
  const D = src.getContext('2d').getImageData(0, 0, w, h).data;
  const body = texCanvas(bn, w, h), bimg = body.createImageData(w, h);
  const line = texCanvas(ln, w, h), limg = line.createImageData(w, h);
  if (P.mode === 'lines' || P.mode === 'both') glowEdges(D, w, h, bimg.data, limg.data, P, px);
  if (P.mode === 'rim' || P.mode === 'both') rimEdges(D, w, h, bimg.data, limg.data, P, px, P.mode === 'both');
  body.putImageData(bimg, 0, 0); line.putImageData(limg, 0, 0);
}
// GPU path: body and lines both from the shaders (texgl.js), the lines added on top as in compose()
function composeGL(c, src, P, px, w, h) {
  const lines = TEXGL.texLayerGL(src, w, h, P, px), tmp = texCanvas('glline', w, h);
  tmp.drawImage(lines, 0, 0, w, h, 0, 0, w, h);                                       // keep the lines: the body pass reuses the GL canvas
  c.drawImage(TEXGL.texBodyGL(w, h, P), 0, 0, w, h, 0, 0, w, h);
  c.globalCompositeOperation = 'lighter'; drawFiltered(c, P.mode !== 'rim' && P.soft > .05 ? `blur(${(P.soft * px / 2).toFixed(2)}px)` : 'none', TXL.glline, 0, 0, w, h, 0, 0, w, h); c.globalCompositeOperation = 'source-over';
}
function compose(c, bn, ln, P, px, w, h) {
  c.drawImage(TXL[bn], 0, 0, w, h, 0, 0, w, h);
  c.globalCompositeOperation = 'lighter';                        // 0.4 × original + 0.6 × edges: the edge layer adds, it does not cover
  drawFiltered(c, P.mode !== 'rim' && P.soft > .05 ? `blur(${(P.soft * px / 2).toFixed(2)}px)` : 'none', TXL[ln], 0, 0, w, h, 0, 0, w, h); c.globalCompositeOperation = 'source-over';      // a hair of softening so the 1 px lines do not stair-step
}
/* One element of a scene drawn through its own look (texElLook(id)): fn(c) draws it into c, centred near (cx, cy) in c's
   current coordinates, within radius r. Only that area is processed, so a frame costs what its textured elements cover.
   Text, charts, panels and glass are never drawn through here, so they keep their plain look. Elements inside another
   textured element (the P badge on PKR) take that element's look. sepId: the look for its texSeparate parts (puncta). */
function texEl(id, c, fn, cx = 0, cy = 0, r = 60, sepId) {
  const look = texElLook(id);
  if (!look || TEX_DEPTH || !c) return fn(c);
  // k: the texture's scale. It follows the camera up to ~1.5× the culture view and then holds: in a deep push-in (scene 5)
  // the rim keeps its on-screen thickness, like the cell's own outline (heroRim), instead of growing past what the edge
  // detection can measure (it showed as a rim truncated to a wedge and a bevel creeping inward as the camera zoomed)
  const m = c.getTransform(), k = Math.min(Math.hypot(m.a, m.b), 2.2 * c.canvas.width / W), pad = 6 * c.canvas.width / W;      // pad: margin for the rim and clay's shadow
  const X = [-r, r, -r, r].map((dx, q) => m.a * (cx + dx) + m.c * (cy + (q < 2 ? -r : r)) + m.e), Y = [-r, r, -r, r].map((dx, q) => m.b * (cx + dx) + m.d * (cy + (q < 2 ? -r : r)) + m.f);
  // live playback (GPU path): reuse this element's last result for up to TEX_N - 1 frames, redrawn through the change in transform
  const key = TEX_GPU() ? texKey(c, id, sepId, cx, cy, r) : null, E = key && TEX_CACHE.get(key);
  if (E && TEX_REUSE && TEX_FRAME - E.frame < TEX_N && (TEX_FRAME + E.phase) % TEX_N !== 0 && Math.abs(Math.hypot(m.a, m.b) / Math.hypot(E.m.a, E.m.b) - 1) < .1) {
    const T = m.multiply(E.m.inverse());
    c.save(); c.setTransform(T); c.imageSmoothingQuality = 'high'; claySuspend(() => c.drawImage(E.cv, 0, 0, E.w, E.h, E.x0, E.y0, E.rw, E.rh)); c.restore(); E.used = TEX_FRAME;
    return;
  }
  const res = texPaint(fn, { main: c, look, px: k, rect: [Math.min(...X) - pad, Math.min(...Y) - pad, Math.max(...X) + pad, Math.max(...Y) + pad], sepLook: sepId ? texElLook(sepId) : undefined });
  if (key && res) {      // keep a copy of the result for the next frames
    const F = E || { cv: document.createElement('canvas'), phase: [...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7) >>> 0 };
    if (F.cv.width < res.w || F.cv.height < res.h) { F.cv.width = Math.max(F.cv.width, Math.ceil(res.w / 64) * 64); F.cv.height = Math.max(F.cv.height, Math.ceil(res.h / 64) * 64); }
    const g = F.cv.getContext('2d'); g.clearRect(0, 0, res.w, res.h); g.drawImage(TXL.full, 0, 0, res.w, res.h, 0, 0, res.w, res.h);
    Object.assign(F, res, { m: DOMMatrix.fromMatrix(m), frame: TEX_FRAME, used: TEX_FRAME }); F.phase %= TEX_N; TEX_CACHE.set(key, F);
  }
}
/* Live playback cache (GPU path only, so offline renders never use it): each textured element is re-textured every TEX_N-th frame
   (staggered across elements); in between its last result is redrawn where the element now is. The cells move a pixel or so a
   frame, so a result one or two frames old is invisible, and the frame costs a third. Paused or scrubbing: always fresh. */
const TEX_CACHE = new Map(); let TEX_N = 3, TEX_FRAME = 0,      // TEX_N: app.js raises it on slow browsers (adaptive quality)
    TEX_REUSE = false, TEX_CVID = 0;
const texKey = (c, id, sepId, cx, cy, r) => `${c.canvas.__tid || (c.canvas.__tid = ++TEX_CVID)}|${id}|${sepId || ''}|${cx.toFixed(1)}|${cy.toFixed(1)}|${r.toFixed(1)}`;
function texFrameTick(playing) {      // app.js calls this once per frame
  TEX_FRAME++; TEX_REUSE = playing && TEX_GPU();
  if (TEX_FRAME % 120 === 0) for (const [k, E] of TEX_CACHE) if (TEX_FRAME - E.used > 240) TEX_CACHE.delete(k);
}
/* Draw fn(c) as its own object for the texture: small things that sit on a cell (bound oligomer puncta, stain puncta)
   would otherwise merge with the cell's outline, and the cell's rim would pick up their colour. Outside a textured
   layer it just draws into c. c is the context the caller draws with (its transform and alpha are carried over). */
let TEX_SEP = null;
// kind 'sep': its own textured pass (puncta); 'nuc': laid on plain (nuclei)
function texSeparate(c, fn, kind = 'sep') {
  if (!TEX_SEP || c.canvas !== TXL.src) return fn(c);               // only from the textured layer itself (an out-of-focus layer keeps its puncta, blurred with the cell)
  const L = TEX_SEP[kind], s = L.c; L.used = true;
  s.save(); s.setTransform(c.getTransform()); s.globalAlpha = c.globalAlpha; s.globalCompositeOperation = c.globalCompositeOperation;
  try { withClay(s, !THEME.light, () => fn(s)); } finally { s.restore(); }
}

// scratch buffers, kept between calls and only ever grown (a 4K frame is 8 M pixels)
let GEB = null;
function geBuffers(N) { if (!GEB || GEB.N < N) GEB = { N, R: new Float32Array(N), G: new Float32Array(N), B: new Float32Array(N), T: new Float32Array(N), M: new Float32Array(N) }; return GEB; }
function smooth121(f, T, w, h) {                     // one pass of a [1 2 1]/4 blur, both directions
  for (let y = 0; y < h; y++) { const o = y * w; T[o] = f[o]; T[o + w - 1] = f[o + w - 1]; for (let x = 1; x < w - 1; x++) T[o + x] = (f[o + x - 1] + 2 * f[o + x] + f[o + x + 1]) * .25; }
  for (let x = 0; x < w; x++) { f[x] = T[x]; f[(h - 1) * w + x] = T[(h - 1) * w + x]; }
  for (let y = 1; y < h - 1; y++) { const o = y * w; for (let x = 0; x < w; x++) f[o + x] = (T[o + x - w] + 2 * T[o + x] + T[o + x + w]) * .25; }
}

function glowEdges(D, w, h, OB, OL, P, px) {
  const N = w * h, { R, G, B, M } = geBuffers(N), T = GEB.T;
  for (let i = 0, j = 0; i < N; i++, j += 4) { R[i] = D[j]; G[i] = D[j + 1]; B[i] = D[j + 2]; }     // raw colour, alpha ignored (as PowerPoint)
  const passes = Math.max(0, Math.round(P.sm * px / 2));                      // smoothing set at 4K, scaled to this canvas
  for (let p = 0; p < passes; p++) { smooth121(R, T, w, h); smooth121(G, T, w, h); smooth121(B, T, w, h); }
  // gradient of the mean colour, for direction and thinning
  const sob = (f, i) => {
    const gx = ((f[i - w + 1] + 2 * f[i + 1] + f[i + w + 1]) - (f[i - w - 1] + 2 * f[i - 1] + f[i + w - 1])) * .25;
    const gy = ((f[i + w - 1] + 2 * f[i + w] + f[i + w + 1]) - (f[i - w - 1] + 2 * f[i - w] + f[i - w + 1])) * .25;
    return [gx, gy];
  };
  for (let i = 0; i < N; i++) T[i] = (R[i] + G[i] + B[i]) / 3;
  M.fill(0);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const [gx, gy] = sob(T, i); M[i] = Math.hypot(gx, gy); }
  const mix = P.mix, keepE = 1 - mix, k = P.k, sat = P.sat, thr = P.thr;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, j = i * 4, a = D[j + 3];
    if (!a) continue;
    OB[j] = D[j] * mix; OB[j + 1] = D[j + 1] * mix; OB[j + 2] = D[j + 2] * mix; OB[j + 3] = a;        // the original, at 40 %
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
    const m = M[i]; if (m <= thr) continue;
    if (P.mode === 'both') {                                         // inner lines only: the outline itself is the rim's job
      let edge = false; const r2 = Math.max(2, Math.round(3 * px / 2));
      for (let o = -r2; o <= r2 && !edge; o++) if (D[(i + o) * 4 + 3] < 250 || D[(i + o * w) * 4 + 3] < 250) edge = true;
      if (edge) continue;
    }
    // thin to one pixel: keep only the ridge of the gradient, across the edge
    const [gx, gy] = sob(T, i), an = Math.atan2(gy, gx), q = ((Math.round(an / (Math.PI / 4)) % 4) + 4) % 4;
    const dy = q === 0 ? 0 : 1, dx = q === 0 ? 1 : q === 1 ? 1 : q === 2 ? 0 : -1;
    if (m < M[i + dy * w + dx] || m < M[i - dy * w - dx]) continue;
    // line colour: the per-channel size of the change, pushed more saturated; brightness from the strongest channel
    const mag = Math.min(255, k * (m - thr));
    // line colour: the brightest cell colour next to the edge (the lit side of it), pushed more saturated
    let cr = 0, cg = 0, cb = 0, cl = -1;
    for (let oy = -w; oy <= w; oy += w) for (let ox = -1; ox <= 1; ox++) { const n = i + oy + ox, l = R[n] + G[n] + B[n]; if (l > cl) { cl = l; cr = R[n]; cg = G[n]; cb = B[n]; } }
    const ca = (cr + cg + cb) / 3; cr = Math.max(0, ca + (cr - ca) * sat); cg = Math.max(0, ca + (cg - ca) * sat); cb = Math.max(0, ca + (cb - ca) * sat);
    const cm = Math.max(cr, cg, cb, 1), hr = cr / cm, hg = cg / cm, hb = cb / cm;
    OL[j] = Math.min(255, hr * mag); OL[j + 1] = Math.min(255, hg * mag); OL[j + 2] = Math.min(255, hb * mag);
    OL[j + 3] = a * keepE;                                                     // the edge layer at 60 %, with the PNG's alpha
  }
}

/* "rim": the edge layer measured straight off testing/pptx-reference.png. For every pixel near an outline, PowerPoint's
   edge brightness was tabulated against the signed distance to the outline and the direction the outline faces
   (scratch analysis, units of the 2880 px export). It comes out as one line per outline, not a border:
     - outlines facing up are faint (~0.1 of the cell colour), facing sideways ~0.75, facing down ~0.9
     - faint lines sit right on the edge, ~1 px wide; bright ones sit ~1 px inside it and are ~2 px wide
     - colour: the cell colour next to the edge, more saturated
   The "outline" is wherever the cell's colour gives way to black or to transparency, so the dark nucleus gets the same
   treatment (a ring). Distance is computed to sub-pixel precision from a coverage field, so the line is anti-aliased. */
let RIMB = null;
function rimEdges(D, w, h, OB, OL, P, px, add) {
  const N = w * h;
  if (!RIMB || RIMB.N < N) RIMB = { N, C: new Float32Array(N), T: new Float32Array(N) };
  const C = RIMB.C, T = RIMB.T, L0 = P.rimL0, mix = P.mix, u = 1.5 / px;           // u: canvas px → 2880-export px (2880 = 1.5 × 1920)
  for (let i = 0, j = 0; i < N; i++, j += 4) {                                    // coverage of the cell's colour (shadow, nucleus, outside = 0)
    const a = D[j + 3] / 255, l = (D[j] + D[j + 1] + D[j + 2]) / 3;
    C[i] = a * Math.min(1, Math.max(0, (l - L0) / 20));
    if (!add) { OB[j] = D[j] * mix; OB[j + 1] = D[j + 1] * mix; OB[j + 2] = D[j + 2] * mix; OB[j + 3] = D[j + 3]; }
  }
  const passes = Math.max(1, Math.round(1.5 / u * P.rimW * P.rimW));        // about one 2880-px pass (more for a wider rim, so the distance reaches further in)
  if (passes <= 6 || w * h * passes < 3e6) for (let p = 0; p < passes; p++) smooth121(C, T, w, h);      // small areas: on the CPU (the GPU round trip costs more)
  else gpuBlur(C, w, h, Math.sqrt(passes / 2));                                  // same spread (n passes of [1 2 1] ≈ a gaussian of sigma √(n/2)), on the GPU
  const R = 4 / u | 0 || 1, sat = P.rimSat, k = P.rimK, wid = P.rimW;
  for (let y = R + 1; y < h - R - 1; y++) for (let x = R + 1; x < w - R - 1; x++) {
    const i = y * w + x, c = C[i];
    if (c < .01 && C[i - 2] < .01 && C[i + 2] < .01 && C[i - 2 * w] < .01 && C[i + 2 * w] < .01) continue;
    const gx = (C[i + 1] - C[i - 1]) * .5, gy = (C[i + w] - C[i - w]) * .5, g = Math.hypot(gx, gy);
    if (g / u < .107 / P.rimW) continue;                                           // no outline here (slope per 2880-export px, so it holds at any zoom)
    const d = (c - .5) / g * u;                                                    // signed distance in 2880 px, + inside
    if (d < -3 || d > 5 * P.rimW) continue;
    const ny = -gy / g;                                                            // outward normal, down = +1
    const t = Math.min(1, Math.max(0, (ny + .85) / 1.1)), s = t * t * (3 - 2 * t);  // 0 facing up .. 1 facing down/sideways
    const peak = (.1 + .8 * s) * k, hw = (.5 + .5 * s) * wid, dc = 1.2 * s + (hw - (.5 + .5 * s));   // a wider band grows inward, its outer edge stays on the outline
    const prof = Math.min(1, Math.max(0, 1 - (Math.abs(d - dc) - hw) / .6));
    if (prof <= 0) continue;
    // the cell colour next to the edge: the brightest colour within ~4 px (2880)
    let cr = 0, cg = 0, cb = 0, cl = -1;
    for (let oy = -R; oy <= R; oy += Math.max(1, R >> 1)) for (let ox = -R; ox <= R; ox += Math.max(1, R >> 1)) {
      const n = (i + oy * w + ox) * 4, l = D[n] + D[n + 1] + D[n + 2]; if (D[n + 3] > 128 && l > cl) { cl = l; cr = D[n]; cg = D[n + 1]; cb = D[n + 2]; }
    }
    if (cl < 0) continue;
    const cm = Math.max(cr, cg, cb, 1), ca = (cr + cg + cb) / 3;
    let vr = Math.max(0, ca + (cr - ca) * sat), vg = Math.max(0, ca + (cg - ca) * sat), vb = Math.max(0, ca + (cb - ca) * sat);
    const vm = Math.max(vr, vg, vb, 1), f = (1 - mix) * peak * prof * cm / vm;    // brightness relative to the cell colour, ×0.6
    vr *= f; vg *= f; vb *= f;
    const j = i * 4, la = Math.min(1, Math.max(vr, vg, vb) / 255); if (la <= .002) continue;
    // premultiplied line, added (lighter) on top of the body; if lines are already there, keep the brighter
    const or = OL[j] * OL[j + 3] / 255, og = OL[j + 1] * OL[j + 3] / 255, ob = OL[j + 2] * OL[j + 3] / 255;
    const pr = Math.min(255, Math.max(or, vr)), pg = Math.min(255, Math.max(og, vg)), pb = Math.min(255, Math.max(ob, vb)), pa = Math.min(1, Math.max(pr, pg, pb) / 255);
    OL[j] = pr / pa; OL[j + 1] = pg / pa; OL[j + 2] = pb / pa; OL[j + 3] = pa * 255;
  }
}

/* Gaussian blur of a 0..1 float field through a canvas filter (16-bit-ish precision from two 8-bit channels). */
function gpuBlur(F, w, h, sigma) {
  const N = w * h, c = texCanvas('gblur', w, h), img = c.createImageData(w, h), d = img.data;
  for (let i = 0, j = 0; i < N; i++, j += 4) { const v = Math.max(0, Math.min(1, F[i])) * 65535 | 0; d[j] = v >> 8; d[j + 1] = v & 255; d[j + 2] = 0; d[j + 3] = 255; }
  c.putImageData(img, 0, 0);
  // the blur is linear, so blurring the high and low bytes as two channels and recombining them gives the blurred value
  const o = texCanvas('gblur2', w, h); drawFiltered(o, `blur(${sigma.toFixed(2)}px)`, TXL.gblur, 0, 0, w, h, 0, 0, w, h);
  const r = o.getImageData(0, 0, w, h).data;
  for (let i = 0, j = 0; i < N; i++, j += 4) F[i] = (r[j] * 256 + r[j + 1]) / 65535;
}
