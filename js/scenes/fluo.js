'use strict';
/* Fluorescence looks for the confocal view (drawConfocal in culture.js). Toggled from the play bar (M key, ?fluo=0|1|2).
   The background stays pitch black in every look; only the stains change.
     0 Flat:  the original additive silhouettes.
     1 Neon:  textured stains with a hot core and a strong neon bloom.
     2 Scope (default): the same textures, closer to a real confocal image: more grain contrast, a tight glow, no hot core.
   Textures:
     pPKR (green): granular cytoplasmic stain (a seeded speckle tile anchored to each cell, so it moves with it), brighter
                   around the nucleus, with the nucleus itself a dark hole (the stain is cytoplasmic).
     DAPI (blue):  an irregular nucleus with a soft edge, mottled chromatin and a few bright chromocentres.
     AβO (red):    irregular clusters of soft puncta of varied size and brightness, occasional larger aggregates, a faint
                   haze along the bound dendrites and scattered puncta over the soma.
   Every pass is a pure function of (S, gt), so scrubbing and offline renders stay exact. */
// Scope is the chosen look; the play-bar toggle is gone (?fluo=0|1 still loads Flat / Neon for comparison).
// 3 Hybrid (default): clay neurons in the stain colours with the stains over them (fluoHybrid), each through its element's
// texture (elements page: 'Neuron, pPKR + DAPI, hybrid', AβO stain = 'AβO stain only'). ?fluo=2 is the previous Scope look.
const FLUO_LOOK = (() => { const q = new URLSearchParams(location.search).get('fluo'); return q != null ? clamp(+q | 0, 0, 3) : 3; })();

/* Confocal style tests (?conf=1..4; 0 = the look before the tests). Every knob in one place:
     mode 'hybrid' (clay cell + stain on top) or 'flat' (the old additive stain, glow passes); clay / stain: hybrid strengths;
     gain: flat-look brightness; tex: pPKR grain strength; grain: grain size; peri: perinuclear enrichment; mottle: uneven
     staining cut out of the green (texture along the dendrites too); gGlow: a glow on the green; red*: AβO puncta size,
     brightness, hot core and glow. */
const CONF_V = {
  0: { mode: 'hybrid', clay: 1, stain: .7, tex: 1, grain: .16, peri: 1, mottle: 0, gGlow: 0, redK: 1, redA: 1, redHot: 0, redGlow: 0 },
  1: { mode: 'hybrid', clay: .7, stain: 1.1, tex: 1.8, grain: .22, peri: .6, mottle: .45, gGlow: 0, redK: 1.3, redA: 1.2, redHot: .2, redGlow: .5, bGlow: 1 },      // Felix's pick (2026-11-20), DAPI glow added
  2: { mode: 'hybrid', clay: .6, stain: 1.25, tex: 2.0, grain: .22, peri: .6, mottle: .5, gGlow: .55, redK: 1.35, redA: 1.25, redHot: .25, redGlow: .6 },
  3: { mode: 'flat', gain: 1.2, tex: 2.0, grain: .22, peri: .3, mottle: .5, gGlow: 0, redK: 1.35, redA: 1.25, redHot: .25, redGlow: .6 },
  4: { mode: 'hybrid', clay: .45, stain: 1.6, tex: 2.2, grain: .24, peri: .5, mottle: .55, gGlow: .8, redK: 1.45, redA: 1.3, redHot: .3, redGlow: .75 },
};
const CONF = CONF_V[(() => { const q = new URLSearchParams(location.search).get('conf'); return q != null ? clamp(+q | 0, 0, 4) : 1; })()];
const WHITE = [255, 255, 255];
const FLL = [];      // offscreen layers, device-pixel sized like the main canvas
function fluoLayer(i, main) {
  const cv2 = main.canvas; if (!FLL[i]) FLL[i] = document.createElement('canvas');
  const L = FLL[i]; if (L.width !== cv2.width || L.height !== cv2.height) { L.width = cv2.width; L.height = cv2.height; }
  const c = L.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
  c.clearRect(0, 0, L.width, L.height); return c;
}

/* Speckle tile: seeded soft grains of many sizes plus a few broad blotches (uneven staining), wrapped so it tiles. */
const FL_TILES = {};
function speckleTile(col, seed) {
  const key = col.join(',') + '|' + seed; if (FL_TILES[key]) return FL_TILES[key];
  const N = 512, cv2 = document.createElement('canvas'); cv2.width = cv2.height = N;
  const c = cv2.getContext('2d'), r = rng(seed);
  const dot = (x, y, rad, a, hot) => {
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const X = x + ox, Y = y + oy; if (X < -rad || X > N + rad || Y < -rad || Y > N + rad) continue;
      const g = c.createRadialGradient(X, Y, 0, X, Y, rad);
      g.addColorStop(0, rgb(mix(col, WHITE, hot), a)); g.addColorStop(.45, rgb(col, a * .55)); g.addColorStop(1, rgb(col, 0));
      c.fillStyle = g; c.beginPath(); c.arc(X, Y, rad, 0, TAU); c.fill();
    }
  };
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) dot(r() * N, r() * N, 50 + r() * 90, .1 + r() * .12, 0);          // uneven staining
  for (let k = 0; k < 2600; k++) { const s = r(); dot(r() * N, r() * N, 1.4 + s * s * 6, .18 + r() * .5, r() < .05 ? .4 : .08); }   // grains
  return FL_TILES[key] = cv2;
}
function speckle(c, col, seed, i, sc) {
  const p = c.createPattern(speckleTile(col, seed), 'repeat');
  p.setTransform(new DOMMatrix().translate(hash(i * 3.7) * 512, hash(i * 9.1) * 512).scale(sc));
  return p;
}

// centreline strokes, width following the strand, skipped inside the soma
function strandCore(c, s, k, minW, skipR) {
  const p = s.pts;
  for (let i = 0; i < s.n; i++) {
    if (Math.hypot(p[i * 2], p[i * 2 + 1]) < skipR) continue;
    c.lineWidth = Math.max(minW, (s.ws[i] + s.ws[i + 1]) * .5 * k);
    c.beginPath(); c.moveTo(p[i * 2], p[i * 2 + 1]); c.lineTo(p[i * 2 + 2], p[i * 2 + 3]); c.stroke();
  }
}
function blob(c, x, y, rad, col, a, hot) {
  const g = c.createRadialGradient(x - rad * .2, y - rad * .2, 0, x, y, rad);
  g.addColorStop(0, rgb(mix(col, WHITE, hot), a)); g.addColorStop(.4, rgb(col, a * .7)); g.addColorStop(1, rgb(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
}

/* pPKR: granular cytoplasm, perinuclear enrichment, nuclear hole, optional hot core along the processes */
function fluoGreen(L, n, i, S, gt, C, neon) {
  const g = C.g * (.16 + .84 * S.ppkr), G = FL.green; if (g <= .004) return;
  n.draw(L, { t: gt, noPuncta: true, fluo: { col: G, a: g * (neon ? .3 : .2), somaA: g * .12, tex: (c, R0, strands) => {
    const ga = c.globalAlpha;
    c.globalAlpha = ga * Math.min(1, g * (neon ? .95 : 1.15) * CONF.tex);
    c.fillStyle = speckle(c, G, 77, i, neon ? .2 : CONF.grain); c.fillRect(-300, -300, 600, 600);
    if (CONF.tex > 1.15) { c.globalAlpha = ga * Math.min(1, g * (CONF.tex - 1)); c.fillStyle = speckle(c, G, 78, i + 5, CONF.grain * 1.4); c.fillRect(-300, -300, 600, 600); }      // a second, coarser grain: the texture reads on the dendrites too
    if (CONF.mottle) {                                                                  // uneven staining: patches knocked back all over the cell
      c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = ga * CONF.mottle; c.fillStyle = speckle(c, [0, 0, 0], 313, i + 11, CONF.grain * 1.8); c.fillRect(-300, -300, 600, 600); c.restore();
    }
    c.globalAlpha = ga;
    const pg = c.createRadialGradient(0, 0, R0 * .3, 0, 0, R0 * 1.7);                  // perinuclear enrichment
    pg.addColorStop(0, rgb(mix(G, WHITE, .2), g * .5 * CONF.peri)); pg.addColorStop(1, rgb(G, 0));
    c.fillStyle = pg; c.fillRect(-R0 * 2, -R0 * 2, R0 * 4, R0 * 4);
    if (neon) { c.lineCap = 'round'; c.strokeStyle = rgb(mix(G, WHITE, .55), g * .4); for (const s of strands) strandCore(c, s, .24, .3, R0 * 1.05); }
    const [ox, oy, rot] = n.nuc;                                                        // nucleus: a dark hole in a cytoplasmic stain
    c.save(); c.translate(ox, oy); c.rotate(rot); c.scale(1, .9);
    const h = c.createRadialGradient(0, 0, 0, 0, 0, R0 * .6);
    h.addColorStop(0, 'rgba(0,0,0,.82)'); h.addColorStop(.75, 'rgba(0,0,0,.6)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = h; c.beginPath(); c.arc(0, 0, R0 * .6, 0, TAU); c.fill();
    c.restore();
  } } });
}

/* DAPI and AβO, drawn after every cell's green so the nuclear hole only cuts the green */
function fluoNucAbo(L, n, i, S, gt, C, neon) {
  const B = FL.blue, R = FL.red, bound = BOUND.includes(i) && C.r > .004;
  if (C.b <= .004 && !bound) return;
  n.draw(L, { t: gt, noPuncta: true, fluo: { col: B, a: 0 }, after: (c, strands, R0) => {
    if (C.b > .004) {
      const [ox, oy, rot] = n.nuc, rx = R0 * .56, ry = R0 * .5, r = rng(500 + i * 17), p1 = r() * TAU, p2 = r() * TAU;
      c.save(); c.translate(ox, oy); c.rotate(rot);
      c.beginPath();                                                                   // slightly irregular outline
      for (let k = 0; k <= 40; k++) { const th = k / 40 * TAU, f = 1 + .06 * Math.sin(3 * th + p1) + .035 * Math.sin(5 * th + p2); const x = Math.cos(th) * rx * f, y = Math.sin(th) * ry * f; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath();
      const base = c.createRadialGradient(0, 0, 0, 0, 0, rx * 1.05);                    // soft edge
      base.addColorStop(0, rgb(B, .55 * C.b)); base.addColorStop(.7, rgb(B, .5 * C.b)); base.addColorStop(1, rgb(B, .12 * C.b));
      c.fillStyle = base; c.fill();
      c.save(); c.clip();
      c.globalAlpha *= C.b * (neon ? .8 : 1); c.fillStyle = speckle(c, B, 191, i, .1); c.fillRect(-rx * 2, -ry * 2, rx * 4, ry * 4);   // mottled chromatin
      c.restore();
      for (let k = 0, m = 5 + (r() * 4 | 0); k < m; k++) {                              // chromocentres
        const a = r() * TAU, d = Math.sqrt(r()) * .7; blob(c, Math.cos(a) * rx * d, Math.sin(a) * ry * d, R0 * (.07 + r() * .08), B, C.b * (.5 + r() * .5), .55);
      }
      c.restore();
    }
    if (!bound) return;
    texSeparate(c, c => {                                                                // AβO stain: its own object for the texture (texture.js)
    const cr = C.r;
    c.lineCap = 'round'; c.strokeStyle = rgb(R, .022 * cr);                               // diffuse oligomer haze along the dendrites
    for (const s of strands) if (s.b.kind !== 'ax') strandCore(c, s, 2.2, 1, R0 * .8);
    aboPuncta(c, n, i, strands, R0, cr, neon);
    });
  } });
}

function aboPuncta(c, n, i, strands, R0, cr, neon, k = CONF.redK, ka = CONF.redA, hot = CONF.redHot) {
  const R = FL.red;
  for (const q of n.dendPoints(strands, 7.5, 3)) {                                     // puncta clusters
    const h = q[4], x = q[0] + q[2] * (q[5] + 1.1), y = q[1] + q[3] * (q[5] + 1.1);
    const big = hash(h * 91.3) > .86, m = 1 + (hash(h * 13.7) * 3 | 0);
    for (let j = 0; j < m; j++) {
      const ox = (hash(h * 7 + j) - .5) * 2.4 * k, oy = (hash(h * 11 + j * 3) - .5) * 2.4 * k;
      const rad = (big && !j ? 2.6 : .9 + hash(h * 5 + j * 1.3) * 1.3) * (neon ? 1.15 : 1) * k;
      blob(c, x + ox, y + oy, rad, R, Math.min(1, cr * ka * (.45 + .55 * hash(h * 17 + j))), Math.min(1, (big && !j ? .7 : .45) + hot));
    }
  }
  const r2 = rng(900 + i * 7);                                                          // oligomers bound over the soma
  for (let j = 0; j < 16; j++) { const a = r2() * TAU, d = Math.sqrt(r2()) * R0 * .95; blob(c, Math.cos(a) * d, Math.sin(a) * d, (.9 + r2() * 1.5) * k, R, Math.min(1, cr * ka * (.35 + .5 * r2())), Math.min(1, .45 + hot)); }
}
/* glow passes for the tests: the green and/or the AβO puncta drawn again into a layer and added back blurred */
function confGlow(S, gt, C) {
  const doG = CONF.gGlow > 0 && C.g > .004, doR = CONF.redGlow > 0 && C.r > .004, doB = (CONF.bGlow || 0) > 0 && C.b > .004; if (!doG && !doR && !doB) return;
  const main = ctx, M = main.getTransform(), px = main.canvas.width / W, A = main.globalAlpha;
  // live playback: the glow (three redraws and nine blurs) is rebuilt on the textures' schedule (texture.js TEX_N) and reused in
  // between while the view, the stains and pPKR stay put; offline renders always rebuild it
  const live = typeof TEX_REUSE !== 'undefined' && TEX_REUSE, key = [M.a, M.b, M.c, M.d, M.e, M.f, C.g, C.b, C.r, S.ppkr, S.spread || 0, S.anomNeuron3Y || 0].map(v => (+v).toFixed(3)).join('|') + '|' + main.canvas.width;
  const G = GLOW_CACHE;
  if (live && G.cv && G.key === key && TEX_FRAME - G.frame < TEX_N) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'lighter'; main.globalAlpha = A; main.drawImage(G.cv, 0, 0); main.restore(); return; }
  const out = live ? (() => { if (!G.cv) G.cv = document.createElement('canvas'); if (G.cv.width !== main.canvas.width || G.cv.height !== main.canvas.height) { G.cv.width = main.canvas.width; G.cv.height = main.canvas.height; } const g = G.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, G.cv.width, G.cv.height); return g; })() : main, OA = live ? 1 : A;
  const pass = (fn, blurs) => {
    const E = fluoLayer(1, main); E.setTransform(M); E.globalCompositeOperation = 'lighter';
    NEU.forEach((n, i) => { E.save(); E.translate(spX(n.x, S.spread || 0) - n.x, i === 3 ? (S.anomNeuron3Y || 0) : 0); fn(E, n, i); E.restore(); });
    for (const [a, b] of blurs) { out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalCompositeOperation = 'lighter'; out.globalAlpha = OA * a; drawFiltered(out, `blur(${(b * px).toFixed(1)}px)`, E.canvas, 0, 0, E.canvas.width, E.canvas.height, 0, 0, E.canvas.width, E.canvas.height); out.restore(); }
  };
  const finish = () => { if (!live) return; G.key = key; G.frame = TEX_FRAME; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'lighter'; main.globalAlpha = A; main.drawImage(G.cv, 0, 0); main.restore(); };
  if (doG) pass((E, n, i) => fluoGreen(E, n, i, S, gt, C, false), [[.45 * CONF.gGlow, 2], [.35 * CONF.gGlow, 8], [.2 * CONF.gGlow, 24]]);
  if (doB) pass((E, n, i) => fluoNucAbo(E, n, i, S, gt, { ...C, g: 0, r: 0 }, false), [[.7 * CONF.bGlow, 2.5], [.5 * CONF.bGlow, 7], [.3 * CONF.bGlow, 18]]);
  if (doR) pass((E, n, i) => { if (BOUND.includes(i)) n.draw(E, { t: gt, noPuncta: true, fluo: { col: FL.red, a: 0 }, after: (c, strands, R0) => aboPuncta(c, n, i, strands, R0, C.r, false) }); }, [[.8 * CONF.redGlow, 2.5], [.5 * CONF.redGlow, 7], [.25 * CONF.redGlow, 18]]);
  finish();
}
const GLOW_CACHE = { cv: null, key: '', frame: -99 };
/* Draw the neurons in the current look. Called inside drawConfocal with the field clip set, worldXf applied and
   globalAlpha = C.a. Returns false for the Flat look so the original code runs. */
function drawFluoLook(S, gt, C) {
  if (!FLUO_LOOK) return false;
  if (FLUO_LOOK === 3 && CONF.mode === 'hybrid') {
    const main = ctx;
    NEU.forEach((n, i) => {
      main.save(); main.translate(spX(n.x, S.spread || 0) - n.x, i === 3 ? (S.anomNeuron3Y || 0) : 0);
      clayResume(() => texEl('flh-neuron', main, c => fluoHybrid(c, n, i, S, gt, C, { clay: CONF.clay, stain: CONF.stain }), n.x, n.y, n.extent(), 'fl-red'));
      main.restore();
    });
    confGlow(S, gt, C);
    return true;
  }
  const main = ctx, M = main.getTransform(), px = main.canvas.width / W, A = main.globalAlpha, neon = FLUO_LOOK === 1;
  const E = fluoLayer(0, main); E.setTransform(M); E.globalCompositeOperation = 'lighter';
  const each = fn => NEU.forEach((n, i) => {
    E.save(); E.translate(spX(n.x, S.spread || 0) - n.x, i === 3 ? (S.anomNeuron3Y || 0) : 0); fn(n, i); E.restore();
  });
  each((n, i) => fluoGreen(E, n, i, S, gt, C, neon));
  each((n, i) => fluoNucAbo(E, n, i, S, gt, C, neon));
  // the wide glow passes blur a half-resolution copy (4x cheaper, and a wide blur hides the lower resolution)
  const ew = E.canvas.width, eh = E.canvas.height;
  if (!FLL.half) FLL.half = document.createElement('canvas');
  const HC = FLL.half; if (HC.width !== Math.ceil(ew / 2) || HC.height !== Math.ceil(eh / 2)) { HC.width = Math.ceil(ew / 2); HC.height = Math.ceil(eh / 2); }
  const hc = HC.getContext('2d'); hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, HC.width, HC.height); hc.drawImage(E.canvas, 0, 0, HC.width, HC.height);
  const blit = (a, blur = 0) => {
    const half = blur > 3;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'lighter'; main.globalAlpha = A * a;
    const f = blur ? `blur(${(blur * px).toFixed(1)}px)` : 'none';
    if (half) drawFiltered(main, f, HC, 0, 0, HC.width, HC.height, 0, 0, ew, eh); else drawFiltered(main, f, E.canvas, 0, 0, ew, eh, 0, 0, ew, eh);
    main.restore();
  };
  if (neon) { blit(1); blit(.7, 2.2); blit(.65, 7); blit(.45, 20); blit(.25, 48); }      // neon: hot halo, wide glow
  else { const k = CONF.mode === 'flat' ? CONF.gain : 1; blit(1); if (k > 1) blit(k - 1); blit(.35 * k, 1.4); blit(.3 * k, 6); blit(.12 * k, 22); }      // scope: a tight optical glow (gain: the flat-look test)
  if (CONF.mode === 'flat') confGlow(S, gt, C);
  return true;
}

// build the stain textures at load, so the first frame of the confocal view does not stall
speckleTile(FL.green, 77); speckleTile(FL.blue, 191);

/* Hybrid look (gallery for now): the cell drawn in clay in the stain colours, so it keeps its volume, then the granular
   pPKR stain and the DAPI / AβO stains laid over it additively. o.stain: how strong the stain layer is; o.clay: brightness
   of the clay body. The stain goes through its own layer because it cuts the nucleus out of itself (destination-out). */
const FL_HL = {};
function fluoHybrid(c, n, i, S, gt, C, o = {}) {
  const G = FL.green, B = FL.blue, g = C.g * (.16 + .84 * S.ppkr), kc = o.clay ?? 1, ks = o.stain ?? .7;
  const dim = mix([30, 34, 38], G, .25 + .75 * Math.min(1, g));       // low pPKR: a duller, greyer green
  const k = v => v.map(x => Math.min(255, x * kc));
  const pal = { rim: k(mix(dim, [255, 255, 255], .12)), body: k(mix([0, 0, 0], dim, .34)), fil: k(mix(dim, [255, 255, 255], .45)), nuc: mix([0, 0, 0], B, C.b > .004 ? .5 : .15) };
  withClay(c, true, () => n.draw(c, { t: gt, noPuncta: true, colR: 1, colPal: pal }));
  const layer = (key, fn, a) => {                                      // draw fn into an offscreen layer with c's transform, add it over c
    const cv = c.canvas; let L = FL_HL[key]; if (!L) L = FL_HL[key] = document.createElement('canvas');
    if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
    const l = L.getContext('2d'); l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1; l.clearRect(0, 0, L.width, L.height);
    l.setTransform(c.getTransform()); l.globalCompositeOperation = 'lighter'; fn(l);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= a; c.drawImage(L, 0, 0); c.restore();
  };
  if (C.g > .004) layer('g', l => fluoGreen(l, n, i, S, gt, C, false), ks);
  if (C.b > .004 || C.r > .004) { c.save(); c.globalCompositeOperation = 'lighter'; fluoNucAbo(c, n, i, S, gt, { ...C, g: 0 }, false); c.restore(); }   // DAPI and AβO added straight on (AβO is its own object for the texture)
}
