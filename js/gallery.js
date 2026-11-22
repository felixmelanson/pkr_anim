'use strict';
/* Elements page: every cell, glyph and pathway molecule of the animation in a grid; click one for a large view with a
   play button, its texture (the scene-1 looks from texture.js) and its colours (palette-overrides.js, shared with the
   animation). Tiles are drawn once (static); only the popup animates, and only while Play is on. */
let ctx = null;                                  // the drawing code (kit.js, molecules.js, texture.js) draws into the global ctx
setThemeMode('dark'); THEME.light = false;
setClayMax(1.6);
TEX_EL_ON = false;                               // the page applies each element's look itself (paint), not the scenes' per-element hook                                 // big cells keep their clay volume (as in the animation)

/* ---------- colour slots ---------- */
const P4 = [['rim', 'Outline'], ['body', 'Fill'], ['fil', 'Highlight'], ['nuc', 'Nucleus']];
const pal4 = (root, group) => P4.map(([k, label]) => ({ path: `${root}.${k}`, label, group }));
const one = (path, label, group = 'Colours') => [{ path, label, group }];

/* ---------- the elements ---------- */
// draw(t, playing): world units, centred near 0 (the page fits each one to its frame). anim: what Play changes.
const C_ASTRO = new Cell('astro', 0, 0, 4242, 1.55, { drift: 2 });
const C_MICRO = new Cell('micro', 0, 0, 311, 1.35, { len: 17, drift: 3 });
const C_PYR = new Cell('neuron', 0, 0, 952, 1.45, { pyr: true, axAng: 1.57, axLen: 118, len: 22, drift: 1.5 });
const C_RGC = new Cell('neuron', 0, 0, 771, 1.45, { axAng: -.22, axLen: 150, len: 24, drift: 1.5, pal: RGCP });
const C_OLIGO = new Cell('oligo', 0, 0, 77, 1.3, {});
const wave = (t, f = 1) => .5 + .5 * Math.sin(t * f);
const mol = (fn, st = {}, gt = 0) => () => { fn(st, gt); };
// culture neurons (culture.js NEU), moved to the origin. 0 carries oligomers (BOUND), HERO (4) does not.
const atOrigin = (n, fn) => { ctx.save(); ctx.translate(-n.x, -n.y); try { fn(); } finally { ctx.restore(); } };
// bound oligomer puncta along the dendrites, as cultureCells draws them; bind 0..1 = how many have landed
const puncta = (n, bind) => (c0, strands) => texSeparate(c0, c => {      // their own object for the texture, as in the animation
  for (const q of n.dendPoints(strands, 7.5, 3)) { const va = clamp((bind * 1.25 - q[4]) / .25); if (va <= 0) continue; c.beginPath(); c.arc(q[0] + q[2] * (q[5] + 1.2), q[1] + q[3] * (q[5] + 1.2), 1.9 * eOut(va), 0, TAU); c.fillStyle = rgb(PC.abo, va); c.fill(); }
});
const bindAt = (t, p) => p ? Math.min(1, (t * .22) % 1.4) : 1;
// confocal view of one culture neuron (fluo.js, Scope look), without the optical glow so a texture can work on the stain itself
const confocal = (i, C) => (t, p) => {
  const n = NEU[i], S = { ppkr: p ? wave(t * .8) : 1 };
  atOrigin(n, () => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fluoGreen(ctx, n, i, S, t, C, false); fluoNucAbo(ctx, n, i, S, t, C, false); ctx.restore(); });
};
// hybrid: the clay neuron in the stain colours, with the granular pPKR stain and the DAPI / AβO stains laid over it (fluo.js)
const confocalHybrid = (i, C, o) => (t, p) => { const n = NEU[i], S = { ppkr: p ? wave(t * .8) : 1 }; atOrigin(n, () => fluoHybrid(ctx, n, i, S, t, C, o)); };
const STAINS = [...one('fl.green', 'pPKR (green)', 'Stains'), ...one('fl.blue', 'DAPI (blue)', 'Stains'), ...one('fl.red', 'AβO (red)', 'Stains')];

const SECTIONS = [
  { title: 'Cells', items: [
    { id: 'astro', name: 'Astrocyte', sub: 'scene 1 bridge', slots: pal4('tp.astro', 'Astrocyte'), draw: t => C_ASTRO.draw(ctx, { t, r: 0 }) },
    { id: 'astro-a1', name: 'A1 astrocyte', sub: 'reactive (scene 1)', slots: [...pal4('a1', 'A1 tint'), ...pal4('tp.astro', 'Astrocyte')], draw: (t, p) => C_ASTRO.draw(ctx, { t, r: p ? wave(t * .6) : 1, colPal: A1P }) },
    { id: 'micro', name: 'Microglia', sub: 'resting', slots: pal4('tp.micro', 'Microglia'), draw: t => C_MICRO.draw(ctx, { t, r: 0, colR: 0 }) },
    { id: 'micro-act', name: 'Activated microglia', sub: 'reactive', slots: pal4('tp.micro', 'Microglia'), draw: (t, p) => C_MICRO.draw(ctx, { t, r: p ? .55 * wave(t * .7) : .55, colR: 0 }) },
    { id: 'neuron', name: 'Pyramidal neuron', sub: 'hippocampal culture', slots: pal4('tp.neuron', 'Neuron'), draw: t => C_PYR.draw(ctx, { t, colR: 0, noPuncta: true }) },
    { id: 'neuron-lit', name: 'Neuron, phospho-PKR', sub: 'lit (gold) state', slots: [...pal4('coral', 'Active tint'), ...pal4('tp.neuron', 'Neuron')], draw: (t, p) => C_PYR.draw(ctx, { t, colR: p ? wave(t) : 1, noPuncta: true }) },
    { id: 'neuron-dying', name: 'Dying neuron', sub: 'beading → fragments', slots: [...pal4('grayp', 'Dying grey'), ...pal4('tp.neuron', 'Neuron'), ...one('ui.casp', 'Caspase glow', 'Other')], draw: (t, p) => C_PYR.draw(ctx, { t, d: p ? (t * .12) % 1 : .62, noPuncta: true }) },
    { id: 'rgc', name: 'Retinal ganglion cell', sub: 'scene 1 bridge', slots: pal4('rgc', 'RGC'), draw: t => C_RGC.draw(ctx, { t, noPuncta: true }) },
    { id: 'rgc-dying', name: 'RGC apoptosis', sub: 'scene 1 · Play: beading → fragments', slots: [...pal4('rgc', 'RGC'), ...pal4('grayp', 'Dying grey'), ...one('ui.casp', 'Caspase glow', 'Other')], draw: (t, p) => C_RGC.draw(ctx, { t, d: p ? (t * .12) % 1 : .62, noPuncta: true }) },
    { id: 'oligo', name: 'Oligodendrocyte', slots: pal4('tp.oligo', 'Oligodendrocyte'), draw: t => C_OLIGO.draw(ctx, { t }) },
    { id: 'neuron-abo', name: 'Neuron with bound AβOs', sub: 'Play: oligomers landing', texFrom: 'neuron', sepFrom: 'puncta', slots: [...pal4('tp.neuron', 'Neuron'), ...one('pc.abo', 'AβO puncta', 'Oligomers')], draw: (t, p) => atOrigin(NEU[0], () => NEU[0].draw(ctx, { t, colR: 0, noPuncta: true, after: puncta(NEU[0], bindAt(t, p)) })) },
  ] },
  { title: 'Confocal (immunofluorescence)', items: [
    { id: 'flh-neuron', name: 'Neuron, pPKR + DAPI · hybrid', sub: 'clay + stain texture · Play: pPKR rises', slots: STAINS.slice(0, 2), draw: confocalHybrid(HERO, { g: 1, b: 1, r: 0 }) },
    { id: 'flh-bound', name: 'AβO-bound neuron · hybrid', sub: 'clay + pPKR + DAPI + AβO', texFrom: 'flh-neuron', sepFrom: 'fl-red', sepLabel: 'AβO stain', slots: STAINS, draw: confocalHybrid(0, { g: 1, b: 1, r: 1 }) },
    { id: 'flh-soft', name: 'Neuron · hybrid, more stain', sub: 'stain stronger over the clay', slots: STAINS.slice(0, 2), draw: confocalHybrid(HERO, { g: 1, b: 1, r: 0 }, { stain: 1, clay: .7 }) },
    { id: 'flh-clay', name: 'Neuron · hybrid, more clay', sub: 'clay stronger, stain as a sheen', slots: STAINS.slice(0, 2), draw: confocalHybrid(HERO, { g: 1, b: 1, r: 0 }, { stain: .35, clay: 1.15 }) },
    { id: 'fl-neuron', name: 'Neuron, pPKR + DAPI', sub: 'flat stain (the old scene look)', slots: STAINS.slice(0, 2), draw: confocal(HERO, { g: 1, b: 1, r: 0 }) },
    { id: 'fl-bound', name: 'AβO-bound neuron', sub: 'flat stain (the old scene look)', texFrom: 'fl-neuron', sepFrom: 'fl-red', sepLabel: 'AβO stain', slots: STAINS, draw: confocal(0, { g: 1, b: 1, r: 1 }) },
    { id: 'fl-green', name: 'pPKR stain only', sub: 'green channel', slots: STAINS.slice(0, 1), draw: confocal(HERO, { g: 1, b: 0, r: 0 }) },
    { id: 'fl-red', name: 'AβO stain only', sub: 'red channel: puncta clusters', slots: STAINS.slice(2), draw: confocal(0, { g: 0, b: 0, r: 1 }) },
  ] },
  { title: 'Molecules in the medium', items: [
    { id: 'abo', name: 'Aβ oligomer', sub: 'AβO', slots: one('pc.abo', 'AβO'), draw: (t, p) => glyph(ctx, 'abo', 0, 0, 60, p ? Math.sin(t * .5) * .3 : 0, 1) },
    { id: 'tnf', name: 'TNF-α', sub: 'homotrimer', slots: one('pc.tnf', 'TNF-α'), draw: (t, p) => glyph(ctx, 'tnf', 0, 0, 60, p ? t * .4 : 0, 1) },
    { id: 'ab', name: 'Infliximab', sub: 'anti-TNF IgG', slots: one('pc.ab', 'Antibody'), draw: (t, p) => glyph(ctx, 'ab', 0, 0, 60, p ? Math.sin(t * .6) * .3 : 0, 1) },
    { id: 'tnfb', name: 'Neutralized TNF-α', sub: 'bound by infliximab', slots: [...one('pc.tnf', 'TNF-α'), ...one('pc.gray', 'Grey'), ...one('pc.ab', 'Antibody')], draw: (t, p) => glyph(ctx, 'tnfb', 0, 0, 60, p ? Math.sin(t * .6) * .25 : 0, 1) },
    { id: 'il1', name: 'IL-1α', sub: 'β-trefoil', slots: one('pc.il1', 'IL-1α'), draw: (t, p) => glyph(ctx, 'il1', 0, 0, 60, p ? t * .4 : 0, 1) },
    { id: 'c1q', name: 'C1q', sub: 'bouquet of tulips', slots: one('pc.c1q', 'C1q'), draw: (t, p) => glyph(ctx, 'c1q', 0, 0, 60, p ? Math.sin(t * .6) * .25 : 0, 1) },
    { id: 'puncta', name: 'Bound AβO puncta', sub: 'the dots on the dendrites · Play: landing', slots: one('pc.abo', 'AβO'), draw: (t, p) => atOrigin(NEU[0], () => NEU[0].draw(ctx, { t, noPuncta: true, fluo: { col: [0, 0, 0], a: 0 }, after: puncta(NEU[0], bindAt(t, p)) })) },
    { id: 'lipid', name: 'Saturated lipid droplets', sub: 'A1 output', slots: one('pc.lps', 'Lipid'), draw: (t, p) => { for (let i = 0; i < 6; i++) { const u = p ? (t * .25 + i / 6) % 1 : i / 6; const x = lerp(-40, 40, u), y = Math.sin(u * Math.PI) * -14 + (i % 3) * 5; ctx.beginPath(); ctx.arc(x, y, 3.4 - (i % 2) * .7, 0, TAU); ctx.fillStyle = rgb(PC.lps); ctx.fill(); ctx.strokeStyle = rgb(mix(PC.lps, [0, 0, 0], .45), .7); ctx.lineWidth = .7; ctx.stroke(); } } },
    { id: 'phos', name: 'Phospho-mark', sub: 'the P badge', slots: one('pc.phos', 'Phospho'), draw: (t, p) => pBadge(0, 0, 18, p ? .4 + .6 * wave(t * 2) : 1) },
  ] },
  { title: 'Pathway proteins', items: [
    { id: 'tnfr1', name: 'TNFR1', sub: 'closes on its ligand', slots: [...pal4('np.tnfr', 'TNFR1'), ...pal4('np.on', 'Active')], draw: (t, p) => mTNFR1({ bound: p ? wave(t) : 0, lit: p ? wave(t) : 0 }) },
    { id: 'ir', name: 'Insulin receptor', slots: [...pal4('np.ir', 'IR'), ...pal4('np.off', 'Inactive grey')], draw: (t, p) => mIR({ off: p ? wave(t) : 0 }) },
    { id: 'pkr', name: 'PKR', sub: 'Play: pThr451', slots: [...pal4('np.prot', 'Protein'), ...pal4('np.on', 'Active'), ...one('pc.phos', 'Phospho', 'Badge')], draw: (t, p) => mPKR({ lit: p ? wave(t) : 0 }) },
    { id: 'eif', name: 'eIF2α', sub: 'Play: pSer51', slots: [...pal4('np.prot', 'Protein'), ...pal4('np.on', 'Active'), ...one('pc.phos', 'Phospho', 'Badge')], draw: (t, p) => mEIF({ lit: p ? wave(t) : 0 }) },
    { id: 'irs', name: 'IRS-1', sub: 'Play: pSer636', slots: [...pal4('np.prot', 'Protein'), ...pal4('np.on', 'Active'), ...one('pc.phos', 'Phospho', 'Badge')], draw: (t, p) => mIRS({ lit: p ? wave(t) : 0 }) },
    { id: 'kin', name: 'eIF2α kinase', sub: 'PERK / GCN2 / HRI', slots: [...pal4('np.prot', 'Protein'), ...pal4('np.off', 'Inactive grey')], draw: (t, p) => mKIN({ off: p ? wave(t) : 0 }) },
    { id: 'jnk', name: 'JNK', slots: [...pal4('np.prot', 'Protein'), ...pal4('np.on', 'Active')], draw: (t, p) => mJNK({ lit: p ? wave(t) : 0 }) },
    { id: 'er', name: 'Endoplasmic reticulum', sub: 'Play: ER stress', slots: [...pal4('np.er', 'ER'), ...pal4('np.on', 'Stressed'), ...one('np.ribo.rim', 'Ribosomes', 'Other')], draw: (t, p) => mER({ lit: p ? wave(t) : 0 }) },
    { id: 'ribo', name: 'Ribosome', sub: 'Play: translation', slots: [...pal4('np.ribo', 'Ribosome'), ...one('col.teal', 'Nascent chain', 'Other')], draw: (t, p) => mRIBO({ stall: 0 }, p ? t : 0) },
    { id: 'syn', name: 'Synapse', sub: 'Play: synapse loss', slots: [...pal4('np.syn', 'Synapse'), ...one('pc.phos', 'PSD', 'Other')], draw: (t, p) => mSYN({ loss: p ? wave(t * .7) : 0 }) },
    { id: 'mem', name: 'Memory readout', sub: 'novel-object arena', slots: [...one('col.teal', 'Familiar object'), ...one('pc.tnf', 'Novel object'), ...one('col.ink', 'Arena outline'), ...one('col.panel', 'Arena floor')], draw: (t, p) => mMEM({ loss: p ? wave(t * .7) : 0 }) },
    { id: 'gone', name: 'Knocked-out node', sub: 'dashed outline', slots: one('pc.gray', 'Grey'), draw: () => mGONE(40) },
    { id: 'board-memb', name: 'Membrane & cytoplasm', sub: 'the neuron interior, scenes 5–13', slots: [...one('board.cyto', 'Cytoplasm', 'Interior'), ...one('board.memb', 'Membrane edge', 'Interior'), ...one('board.head', 'Lipid heads', 'Lipids'), ...one('board.tail', 'Lipid tails', 'Lipids')], draw: () => {
      const B = PAL().board, st = 12.5, br = st * .52, gap = 22;
      ctx.fillStyle = rgb(B.cyto); ctx.fillRect(-90, gap / 2, 180, 70);
      ctx.strokeStyle = rgb(B.memb); ctx.lineWidth = gap + 2 * br; ctx.beginPath(); ctx.moveTo(-90, -40); ctx.lineTo(-30, -40); ctx.stroke();
      for (let x = -90 + st / 2; x < 90; x += st) {
        ctx.strokeStyle = rgb(B.tail, .5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 1.4, -gap / 2 + 4); ctx.lineTo(x - .8, -1); ctx.moveTo(x + 1.4, gap / 2 - 4); ctx.lineTo(x + .8, 1); ctx.stroke();
        for (const y of [-gap / 2, gap / 2]) { ctx.beginPath(); ctx.arc(x, y, br, 0, TAU); ctx.fillStyle = rgb(B.head); ctx.fill(); ctx.strokeStyle = rgb(mix(B.head, [0, 0, 0], .4), .8); ctx.lineWidth = .9; ctx.stroke(); }
      }
    } },
  ] },
];
const ITEMS = SECTIONS.flatMap(s => s.items);

/* ---------- per-element settings (texture, shift) ---------- */
const GKEY = 'pkr.gallery.v1';
const gLoad = () => { try { return JSON.parse(localStorage.getItem(GKEY)) || {}; } catch (e) { return {}; } };
const gSave = o => { try { localStorage.setItem(GKEY, JSON.stringify(o)); } catch (e) { } };
// an element's settings: the project look (js/look.js) under this browser's own changes. tex is stored as a name.
const texIndex = v => typeof v === 'number' ? v : Math.max(0, TEX_LOOKS.indexOf(v));
const itemSet = id => { const base = (typeof LOOK !== 'undefined' && LOOK.elements && LOOK.elements[id]) || {}, s = { ...base, ...(gLoad()[id] || {}) }; return { ...s, tex: s.tex == null ? 0 : texIndex(s.tex) }; };
function itemUpdate(id, fn) { const all = gLoad(), next = fn({ ...(all[id] || {}) }); if (next && Object.keys(next).length) all[id] = next; else delete all[id]; gSave(all); }

/* ---------- drawing ---------- */
// world bounds of each element, measured once by drawing it (static and at a few playing moments) and reading the pixels
const FIT = {};
function measure(it) {
  if (FIT[it.id]) return FIT[it.id];
  const S = 900, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
  const k = 2;                                   // 2 px per world unit: ±225 units fit
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (const [t, p] of [[0, false], [0, true], [1.6, true], [3.1, true], [4.7, true]]) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.setTransform(k, 0, 0, k, S / 2, S / 2);
    ctx = g; try { withClay(g, true, () => it.draw(t, p)); } finally { ctx = null; }
    const d = g.getImageData(0, 0, S, S).data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < x0) { x0 = y0 = S / 2 - 50; x1 = y1 = S / 2 + 50; }
  return FIT[it.id] = { cx: ((x0 + x1) / 2 - S / 2) / k, cy: ((y0 + y1) / 2 - S / 2) / k, span: Math.max(x1 - x0, y1 - y0) / k };
}
// paint one element into a canvas, fitted, through its texture
function paint(cv, it, t, playing, margin = 1.18) {
  const g = cv.getContext('2d'), f = measure(it), s = cv.width / (f.span * margin);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);      // transparent: the black is the page behind it, so a copied image has no background
  g.setTransform(s, 0, 0, s, cv.width / 2 - f.cx * s, cv.height / 2 - f.cy * s);
  // texFrom: the element whose texture this one shares (bound neuron = neuron); sepFrom: the texture of its separate parts (puncta)
  const look = itemSet(it.texFrom || it.id).tex || 0, sepLook = it.sepFrom ? itemSet(it.sepFrom).tex || 0 : undefined;
  ctx = g;
  try {
    const draw = () => withClay(ctx, true, () => it.draw(t, playing));
    if (look > 0 || sepLook > 0) texPaint(draw, { look, px: s, sepLook }); else draw();
  } finally { ctx = null; }
}

/* ---------- grid ---------- */
const TILE = new Map();
function buildGrid() {
  const root = document.getElementById('sections'), dpr = Math.min(2, devicePixelRatio || 1);
  for (const sec of SECTIONS) {
    const s = document.createElement('section'); s.className = 'section';
    s.innerHTML = `<h2>${sec.title}</h2>`;
    const ul = document.createElement('ul'); ul.className = 'grid'; ul.setAttribute('role', 'list');
    for (const it of sec.items) {
      const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.setAttribute('aria-haspopup', 'dialog');
      const cv = document.createElement('canvas'); cv.width = cv.height = Math.round(176 * dpr);
      const lab = document.createElement('span'); lab.textContent = it.name;
      if (it.sub) { const sm = document.createElement('small'); sm.textContent = it.sub; lab.appendChild(sm); }
      b.append(cv, lab); b.addEventListener('click', () => openViewer(ITEMS.indexOf(it)));
      li.appendChild(b); ul.appendChild(li); TILE.set(it.id, cv);
    }
    s.appendChild(ul); root.appendChild(s);
  }
  // draw the tiles a few at a time so the page shows up at once
  let i = 0; const next = () => { const end = Math.min(ITEMS.length, i + 4); for (; i < end; i++) paint(TILE.get(ITEMS[i].id), ITEMS[i], 0, false); if (i < ITEMS.length) requestAnimationFrame(next); };
  requestAnimationFrame(next);
}
const repaintTiles = () => { for (const it of ITEMS) paint(TILE.get(it.id), it, 0, false); };

/* ---------- popup ---------- */
const dlg = document.getElementById('viewer'), big = document.getElementById('big'), playBtn = document.getElementById('play');
let cur = -1, playing = false, t0 = 0, tNow = 0, raf = 0, dirty = false;
function sizeBig() { const r = big.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); const n = Math.max(200, Math.round(Math.min(r.width, r.height) * dpr)); if (big.width !== n) { big.width = big.height = n; } }
function redraw() { if (cur < 0) return; sizeBig(); paint(big, ITEMS[cur], tNow, playing, 1.12); }
function loop(now) {
  if (!playing) return;
  tNow = (now - t0) / 1000; redraw();
  raf = requestAnimationFrame(loop);
}
function setPlaying(p) {
  playing = p; playBtn.textContent = p ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', p);
  cancelAnimationFrame(raf);
  if (p) { t0 = performance.now() - tNow * 1000; raf = requestAnimationFrame(loop); } else redraw();
}
function openViewer(i) {
  cur = i; tNow = 0; document.getElementById('name').textContent = ITEMS[i].name;
  if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add('has-dialog'); }
  buildControls(ITEMS[i]); setPlaying(false); requestAnimationFrame(redraw);
}
function closeViewer() { setPlaying(false); cur = -1; if (dlg.open) dlg.close(); document.documentElement.classList.remove('has-dialog'); if (dirty) { dirty = false; repaintTiles(); } }
dlg.addEventListener('cancel', e => { e.preventDefault(); closeViewer(); });
dlg.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeViewer));
document.getElementById('prev').addEventListener('click', () => openViewer((cur - 1 + ITEMS.length) % ITEMS.length));
document.getElementById('next').addEventListener('click', () => openViewer((cur + 1) % ITEMS.length));
playBtn.addEventListener('click', () => setPlaying(!playing));
// copy the big view as a PNG with a transparent background (falls back to a download where the clipboard is not allowed)
const copyBtn = document.getElementById('copyImg');
copyBtn.addEventListener('click', () => {
  if (cur < 0) return;
  const it = ITEMS[cur], name = it.id + '.png';
  big.toBlob(async blob => {
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); copyBtn.textContent = 'Copied'; }
    catch (e) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); copyBtn.textContent = 'Saved'; }
    setTimeout(() => copyBtn.textContent = 'Copy PNG', 1400);
  }, 'image/png');
});
dlg.addEventListener('keydown', e => {
  if (e.target.closest('.controls')) return;
  if (e.key === 'ArrowRight') openViewer((cur + 1) % ITEMS.length);
  else if (e.key === 'ArrowLeft') openViewer((cur - 1 + ITEMS.length) % ITEMS.length);
  else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
});
addEventListener('resize', () => { if (cur >= 0 && !playing) redraw(); });

/* ---------- controls ---------- */
function shiftColor(rgbA, sh) {          // hue (degrees), saturation and lightness (-100..100), as in physio_render
  const [r, g, b] = rgbA.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0; const l = (max + min) / 2;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  const H = (((h + sh.h) % 360) + 360) % 360, S = Math.min(1, Math.max(0, s * (1 + sh.s / 100)));
  const L = Math.min(1, Math.max(0, sh.l >= 0 ? l + (1 - l) * (sh.l / 100) : l * (1 + sh.l / 100)));
  const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((H / 60) % 2) - 1)), m = L - C / 2;
  const [r1, g1, b1] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}
const changed = () => { dirty = true; if (!playing) redraw(); };
const uniqSlots = it => { const seen = new Set(); return it.slots.filter(s => !seen.has(s.path) && seen.add(s.path)); };

function buildControls(it) {
  const box = document.getElementById('controls'); box.innerHTML = '';
  const st = itemSet(it.id), slots = uniqSlots(it), over = (palLoad().dark || {});
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // texture (and, for an element with separate parts, theirs: each is its own setting)
  const texRow = (label, target, note) => {
    const tb = el('div', 'block'); tb.append(el('div', 'label', label));
    const seg = el('div', 'seg'); seg.setAttribute('role', 'radiogroup');
    const curT = itemSet(target).tex || 0;
    TEX_LOOKS.forEach((name, i) => {
      const b = el('button', null, name); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', curT === i);
      b.addEventListener('click', () => { itemUpdate(target, s => ({ ...s, tex: name })); seg.querySelectorAll('button').forEach((x, j) => x.setAttribute('aria-checked', j === i)); changed(); });
      seg.append(b);
    });
    tb.append(seg); if (note) tb.append(el('p', 'small-note', note)); box.append(tb);
  };
  const nameOf = id => (ITEMS.find(x => x.id === id) || {}).name || id;
  texRow(it.sepFrom ? 'Texture: cell' : 'Texture', it.texFrom || it.id, it.texFrom ? `Shared with “${nameOf(it.texFrom)}”.` : null);
  if (it.sepFrom) texRow('Texture: ' + (it.sepLabel || 'puncta'), it.sepFrom, `Shared with “${nameOf(it.sepFrom)}”.`);

  // shift all colours of this element
  const sh = st.shift || { h: 0, s: 0, l: 0 };
  const sb = el('div', 'block'), sl = el('div', 'label', 'Shift all colours');
  const rs = el('button', 'mini', 'reset'); rs.type = 'button'; rs.hidden = !(sh.h || sh.s || sh.l); sl.append(rs); sb.append(sl);
  const applyShift = () => {
    const s = itemSet(it.id); let base = s.shiftBase;
    if (!base) { base = {}; for (const sl of slots) base[sl.path] = rgbArrToHex(palCurrent('dark', sl.path)); }   // colours before shifting
    const v = s.shift || { h: 0, s: 0, l: 0 }, any = v.h || v.s || v.l;
    for (const sl of slots) palSetOverride('dark', sl.path, any ? rgbArrToHex(shiftColor(hexToRgbArr(base[sl.path]), v)) : (base[sl.path] === rgbArrToHex(palDefault('dark', sl.path)) ? null : base[sl.path]));
    itemUpdate(it.id, x => ({ ...x, shiftBase: any ? base : undefined, shift: any ? v : undefined }));
    rs.hidden = !any; refreshSwatches(); changed();
  };
  const ranges = {};
  for (const [k, name, min, max] of [['h', 'Hue', -180, 180], ['s', 'Saturation', -100, 100], ['l', 'Lightness', -100, 100]]) {
    const row = el('label', 'shift'), r = el('input'), val = el('span', 'val', String(sh[k]));
    r.type = 'range'; r.min = min; r.max = max; r.value = sh[k]; ranges[k] = [r, val];
    r.addEventListener('input', () => { val.textContent = r.value > 0 ? '+' + r.value : r.value; itemUpdate(it.id, s => { const base = s.shiftBase || Object.fromEntries(slots.map(x => [x.path, rgbArrToHex(palCurrent('dark', x.path))])); return { ...s, shiftBase: base, shift: { ...(s.shift || { h: 0, s: 0, l: 0 }), [k]: +r.value } }; }); applyShift(); });
    r.addEventListener('dblclick', () => { r.value = 0; r.dispatchEvent(new Event('input')); });
    row.append(el('span', null, name), r, val); sb.append(row);
  }
  rs.addEventListener('click', () => { for (const k in ranges) { ranges[k][0].value = 0; ranges[k][1].textContent = '0'; } itemUpdate(it.id, s => ({ ...s, shift: { h: 0, s: 0, l: 0 } })); applyShift(); });
  box.append(sb);

  // colour swatches, by group
  const sw = [];
  const groups = [...new Set(slots.map(s => s.group))];
  for (const g of groups) {
    const gb = el('div', 'block'); gb.append(el('div', 'label', g));
    const grid = el('div', 'swatches');
    for (const slot of slots.filter(s => s.group === g)) {
      const lab = el('label', 'swatch'), inp = el('input'); inp.type = 'color';
      const reset = el('button', 'reset', '↺'); reset.type = 'button'; reset.title = 'Back to the original colour';
      lab.append(inp, el('span', null, slot.label), reset);
      inp.addEventListener('input', () => { dropShift(); palSetOverride('dark', slot.path, inp.value); refreshSwatches(); changed(); });
      reset.addEventListener('click', e => { e.preventDefault(); dropShift(); palSetOverride('dark', slot.path, null); refreshSwatches(); changed(); });
      sw.push({ slot, lab, inp, reset }); grid.append(lab);
    }
    gb.append(grid); box.append(gb);
  }
  // editing a colour by hand ends the shift (the shifted colours become the new colours)
  function dropShift() { const s = itemSet(it.id); if (s.shift) { itemUpdate(it.id, x => ({ ...x, shift: undefined, shiftBase: undefined })); for (const k in ranges) { ranges[k][0].value = 0; ranges[k][1].textContent = '0'; } rs.hidden = true; } }
  function refreshSwatches() {
    const ov = (palLoad().dark || {});
    for (const s of sw) { s.inp.value = rgbArrToHex(palCurrent('dark', s.slot.path)); const ch = s.slot.path in ov; s.lab.toggleAttribute('data-changed', ch); s.reset.hidden = !ch; }
  }
  refreshSwatches();

  // actions
  const ab = el('div', 'actions');
  const resetAll = el('button', 'pill', 'Reset element'); resetAll.type = 'button';
  resetAll.addEventListener('click', () => { for (const s of slots) palSetOverride('dark', s.path, null); itemUpdate(it.id, () => null); buildControls(it); changed(); });
  const copy = el('button', 'pill', 'Copy JSON'); copy.type = 'button';
  copy.addEventListener('click', async () => {
    const json = JSON.stringify({ palette: palLoad(), elements: gLoad() }, null, 2);
    try { await navigator.clipboard.writeText(json); copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy JSON', 1400); } catch (e) { prompt('Copy these settings:', json); }
  });
  ab.append(resetAll, copy); box.append(ab);
  box.append(el('p', 'small-note', 'Colours are shared with every element that uses them. Colours and textures both reach the animation (reload it); paste Copy JSON into look/jsons.md to keep them for renders.'));
}

buildGrid();
