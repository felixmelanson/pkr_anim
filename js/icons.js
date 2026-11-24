'use strict';
/* "Custom Icons": the animation's cells and molecules, one by one, for the viewer's icons panel (ui-panels.js). Each is drawn
   exactly as the scenes draw it, through the project look (look/*.md → js/look.js) at full quality: no playback shortcuts.
   ICONS[i] = { id, name, look (texture id), sep (texture of its separate parts), draw(t, playing) }, centred near 0. */
const ICONS = (() => {
  const wave = (t, f = 1) => .5 + .5 * Math.sin(t * f);
  const C_ASTRO = new Cell('astro', 0, 0, 4242, 1.55, { drift: 2 });
  const C_MICRO = new Cell('micro', 0, 0, 311, 1.35, { len: 17, drift: 3 });
  const C_PYR = new Cell('neuron', 0, 0, 952, 1.45, { pyr: true, axAng: 1.57, axLen: 118, len: 22, drift: 1.5 });
  const C_RGC = new Cell('neuron', 0, 0, 771, 1.45, { axAng: -.22, axLen: 150, len: 24, drift: 1.5, pal: RGCP });
  const C_OLIGO = new Cell('oligo', 0, 0, 77, 1.3, {});
  const atOrigin = (n, fn) => { ctx.save(); ctx.translate(-n.x, -n.y); try { fn(); } finally { ctx.restore(); } };
  const puncta = (n, bind) => (c0, strands) => texSeparate(c0, c => {
    for (const q of n.dendPoints(strands, 7.5, 3)) { const va = clamp((bind * 1.25 - q[4]) / .25); if (va <= 0) continue; c.beginPath(); c.arc(q[0] + q[2] * (q[5] + 1.2), q[1] + q[3] * (q[5] + 1.2), 1.9 * eOut(va), 0, TAU); c.fillStyle = rgb(PC.abo, va); c.fill(); }
  });
  const bindAt = (t, p) => p ? Math.min(1, (t * .22) % 1.4) : 1;
  const confocal = (i, C) => (t, p) => { const n = NEU[i], S = { ppkr: p ? wave(t * .8) : 1 }; atOrigin(n, () => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fluoGreen(ctx, n, i, S, t, C, false); fluoNucAbo(ctx, n, i, S, t, C, false); ctx.restore(); }); };
  const confocalHybrid = (i, C, o) => (t, p) => { const n = NEU[i], S = { ppkr: p ? wave(t * .8) : 1 }; atOrigin(n, () => fluoHybrid(ctx, n, i, S, t, C, o)); };
  const glyphItem = (k, spin) => (t, p) => glyph(ctx, k, 0, 0, 60, p ? spin(t) : 0, 1);
  // the S9 ribosome: the initiator tRNA lands on the start codon, the large subunit joins, the protein comes out (loops while playing)
  const ribosome = (t, p) => {
    const u = p ? (t / 7) % 1 : .86, my = 40, ax = -176 + 16 + (MRNA_AUG + 1) * 15;
    const land = ease(seg(u, .05, .3)), join = ease(seg(u, .32, .45)), prot = seg(u, .46, .92), out = 1 - seg(u, .93, 1);
    flat(() => {
      ctx.save(); ctx.globalAlpha *= p ? out : 1;
      if (join > .004) fadeLayer(join, () => ribLarge(0, my - 8 - 50 * (1 - join), .88));
      ribSmall(0, my + 6, .88); mRNA(-176, 150, my);
      tRNA(lerp(ax - 120, ax, land), lerp(my - 120, my - 26, land), 1);
      protein(102, my - 85, prot * 15);
      ctx.restore();
    });
  };
  return [
    // cells
    { id: 'astro', name: 'Astrocyte', draw: t => C_ASTRO.draw(ctx, { t, r: 0 }) },
    { id: 'astro-a1', name: 'A1 astrocyte', draw: (t, p) => C_ASTRO.draw(ctx, { t, r: p ? wave(t * .6) : 1, colPal: A1P }) },
    { id: 'micro', name: 'Microglia', draw: t => C_MICRO.draw(ctx, { t, r: 0, colR: 0 }) },
    { id: 'micro-act', name: 'Activated microglia', draw: (t, p) => C_MICRO.draw(ctx, { t, r: p ? .55 * wave(t * .7) : .55, colR: 0 }) },
    { id: 'neuron', name: 'Pyramidal neuron', draw: t => C_PYR.draw(ctx, { t, colR: 0, noPuncta: true }) },
    { id: 'neuron-lit', name: 'Neuron, phospho-PKR', draw: (t, p) => C_PYR.draw(ctx, { t, colR: p ? wave(t) : 1, noPuncta: true }) },
    { id: 'neuron-dying', name: 'Dying neuron', draw: (t, p) => C_PYR.draw(ctx, { t, d: p ? (t * .12) % 1 : .62, noPuncta: true }) },
    { id: 'rgc', name: 'Retinal ganglion cell', draw: t => C_RGC.draw(ctx, { t, noPuncta: true }) },
    { id: 'rgc-dying', name: 'RGC apoptosis', draw: (t, p) => C_RGC.draw(ctx, { t, d: p ? (t * .12) % 1 : .62, noPuncta: true }) },
    { id: 'oligo', name: 'Oligodendrocyte', draw: t => C_OLIGO.draw(ctx, { t }) },
    { id: 'neuron-abo', name: 'Neuron (bound AβOs)', look: 'neuron', sep: 'puncta', draw: (t, p) => atOrigin(NEU[0], () => NEU[0].draw(ctx, { t, colR: 0, noPuncta: true, after: puncta(NEU[0], bindAt(t, p)) })) },
    // confocal (immunofluorescence)
    { id: 'flh-soft', name: 'Fluorescent pPKR', draw: confocalHybrid(HERO, { g: 1, b: 1, r: 0 }, { stain: 1, clay: .7 }) },
    { id: 'flh-bound', name: 'Fluorescent AβO+PKR+DAPI', look: 'flh-neuron', sep: 'fl-red', draw: confocalHybrid(0, { g: 1, b: 1, r: 1 }) },
    { id: 'fl-green', name: 'pPKR stain only', draw: confocal(HERO, { g: 1, b: 0, r: 0 }) },
    { id: 'fl-red', name: 'AβO stain only', draw: confocal(0, { g: 0, b: 0, r: 1 }) },
    // molecules in the medium
    { id: 'abo', name: 'Aβ oligomer', draw: glyphItem('abo', t => Math.sin(t * .5) * .3) },
    { id: 'tnf', name: 'TNF-α', draw: glyphItem('tnf', t => t * .4) },
    { id: 'ab', name: 'Infliximab', draw: glyphItem('ab', t => Math.sin(t * .6) * .3) },
    { id: 'tnfb', name: 'Neutralized TNF-α', draw: glyphItem('tnfb', t => Math.sin(t * .6) * .25) },
    { id: 'il1', name: 'IL-1α', draw: glyphItem('il1', t => t * .4) },
    { id: 'c1q', name: 'C1q', draw: glyphItem('c1q', t => Math.sin(t * .6) * .25) },
    { id: 'lipid', name: 'Saturated lipid droplets', draw: (t, p) => { for (let i = 0; i < 6; i++) { const u = p ? (t * .25 + i / 6) % 1 : i / 6; const x = lerp(-40, 40, u), y = Math.sin(u * Math.PI) * -14 + (i % 3) * 5; ctx.beginPath(); ctx.arc(x, y, 3.4 - (i % 2) * .7, 0, TAU); ctx.fillStyle = rgb(PC.lps); ctx.fill(); ctx.strokeStyle = rgb(mix(PC.lps, [0, 0, 0], .45), .7); ctx.lineWidth = .7; ctx.stroke(); } } },
    // pathway
    { id: 'er', name: 'Endoplasmic reticulum', draw: (t, p) => mER({ lit: p ? wave(t) : 0 }) },
    { id: 'ribosome', name: 'Ribosome', draw: ribosome },
    { id: 'ir', name: 'Insulin receptor', draw: (t, p) => mIR({ off: p ? wave(t) : 0 }) },
    { id: 'tnfr1', name: 'TNFR1', draw: (t, p) => mTNFR1({ bound: p ? wave(t) : 0, lit: p ? wave(t) : 0 }) },
    { id: 'syn', name: 'Synapse', draw: (t, p) => mSYN({ loss: p ? wave(t * .7) : 0 }) },
  ];
})();
/* The code shown next to each icon: the same calls the animation makes, wrapped in a small drawIcon(t). setup: lines before it;
   call: what it draws (one expression, or several lines); pal: the palette entry whose colours are listed. */
const ICON_CODE = {
  astro: { setup: ["const astrocyte = new Cell('astro', 0, 0, 4242, 1.55, { drift: 2 });"], call: 'astrocyte.draw(ctx, { t, r: 0 })', pal: 'tp.astro' },
  'astro-a1': { setup: ["const astrocyte = new Cell('astro', 0, 0, 4242, 1.55, { drift: 2 });"], call: 'astrocyte.draw(ctx, { t, r: 1, colPal: A1P })      // r: 0 resting → 1 reactive (A1)', pal: 'a1' },
  micro: { setup: ["const microglia = new Cell('micro', 0, 0, 311, 1.35, { len: 17, drift: 3 });"], call: 'microglia.draw(ctx, { t, r: 0, colR: 0 })', pal: 'tp.micro' },
  'micro-act': { setup: ["const microglia = new Cell('micro', 0, 0, 311, 1.35, { len: 17, drift: 3 });"], call: 'microglia.draw(ctx, { t, r: .55, colR: 0 })      // r: activation, 0..1', pal: 'tp.micro' },
  neuron: { setup: ["const neuron = new Cell('neuron', 0, 0, 952, 1.45, { pyr: true, axAng: 1.57, axLen: 118, len: 22, drift: 1.5 });"], call: 'neuron.draw(ctx, { t, colR: 0, noPuncta: true })', pal: 'tp.neuron' },
  'neuron-lit': { setup: ["const neuron = new Cell('neuron', 0, 0, 952, 1.45, { pyr: true, axAng: 1.57, axLen: 118, len: 22, drift: 1.5 });"], call: "neuron.draw(ctx, { t, colR: 1, noPuncta: true })      // colR: 0..1 into the gold 'phospho' palette", pal: 'coral' },
  'neuron-dying': { setup: ["const neuron = new Cell('neuron', 0, 0, 952, 1.45, { pyr: true, axAng: 1.57, axLen: 118, len: 22, drift: 1.5 });"], call: 'neuron.draw(ctx, { t, d: .62, noPuncta: true })      // d: 0..1 beading → fragments', pal: 'grayp' },
  rgc: { setup: ["const rgc = new Cell('neuron', 0, 0, 771, 1.45, { axAng: -.22, axLen: 150, len: 24, drift: 1.5, pal: RGCP });"], call: 'rgc.draw(ctx, { t, noPuncta: true })', pal: 'rgc' },
  'rgc-dying': { setup: ["const rgc = new Cell('neuron', 0, 0, 771, 1.45, { axAng: -.22, axLen: 150, len: 24, drift: 1.5, pal: RGCP });"], call: 'rgc.draw(ctx, { t, d: .62, noPuncta: true })      // d: 0..1 beading → fragments', pal: 'rgc' },
  oligo: { setup: ["const oligo = new Cell('oligo', 0, 0, 77, 1.3, {});"], call: 'oligo.draw(ctx, { t })', pal: 'tp.oligo' },
  'neuron-abo': { setup: ['const n = NEU[0];      // a culture neuron (js/scenes/culture.js)', '// the bound oligomers: dots along the dendrites, textured as their own layer', 'const puncta = (c0, strands) => texSeparate(c0, c => {', '  for (const q of n.dendPoints(strands, 7.5, 3)) {', '    c.beginPath(); c.arc(q[0] + q[2] * (q[5] + 1.2), q[1] + q[3] * (q[5] + 1.2), 1.9, 0, TAU);', '    c.fillStyle = rgb(PC.abo); c.fill();', '  }', '});'], call: 'n.draw(ctx, { t, colR: 0, noPuncta: true, after: puncta })', pal: 'tp.neuron' },
  'flh-soft': { setup: ['const i = HERO, n = NEU[i];      // a culture neuron (js/scenes/culture.js)'], call: 'fluoHybrid(ctx, n, i, { ppkr: 1 }, t, { g: 1, b: 1, r: 0 }, { stain: 1, clay: .7 })      // js/scenes/fluo.js', pal: 'fl' },
  'flh-bound': { setup: ['const n = NEU[0];      // a culture neuron that carries oligomers'], call: 'fluoHybrid(ctx, n, 0, { ppkr: 1 }, t, { g: 1, b: 1, r: 1 })      // js/scenes/fluo.js', pal: 'fl' },
  'fl-green': { setup: ['const i = HERO, n = NEU[i];'], call: "ctx.save(); ctx.globalCompositeOperation = 'lighter';\nfluoGreen(ctx, n, i, { ppkr: 1 }, t, { g: 1, b: 0, r: 0 }, false);      // js/scenes/fluo.js\nctx.restore();", pal: 'fl' },
  'fl-red': { setup: ['const n = NEU[0];'], call: "ctx.save(); ctx.globalCompositeOperation = 'lighter';\nfluoNucAbo(ctx, n, 0, { ppkr: 1 }, t, { g: 0, b: 0, r: 1 }, false);      // js/scenes/fluo.js\nctx.restore();", pal: 'fl' },
  abo: { call: "glyph(ctx, 'abo', 0, 0, 60, 0, 1)      // js/core/glyphs.js: kind, x, y, size, angle, alpha", pal: 'pc.abo' },
  tnf: { call: "glyph(ctx, 'tnf', 0, 0, 60, 0, 1)      // js/core/glyphs.js: kind, x, y, size, angle, alpha", pal: 'pc.tnf' },
  ab: { call: "glyph(ctx, 'ab', 0, 0, 60, 0, 1)      // js/core/glyphs.js: kind, x, y, size, angle, alpha", pal: 'pc.ab' },
  tnfb: { call: "glyph(ctx, 'tnfb', 0, 0, 60, 0, 1)      // js/core/glyphs.js: TNF-α held by infliximab", pal: 'pc.tnf' },
  il1: { call: "glyph(ctx, 'il1', 0, 0, 60, 0, 1)      // js/core/glyphs.js: kind, x, y, size, angle, alpha", pal: 'pc.il1' },
  c1q: { call: "glyph(ctx, 'c1q', 0, 0, 60, 0, 1)      // js/core/glyphs.js: kind, x, y, size, angle, alpha", pal: 'pc.c1q' },
  lipid: { call: 'for (let i = 0; i < 6; i++) {\n  const u = (t * .25 + i / 6) % 1, x = lerp(-40, 40, u), y = Math.sin(u * Math.PI) * -14 + (i % 3) * 5;\n  ctx.beginPath(); ctx.arc(x, y, 3.4 - (i % 2) * .7, 0, TAU);\n  ctx.fillStyle = rgb(PC.lps); ctx.fill();\n  ctx.strokeStyle = rgb(mix(PC.lps, [0, 0, 0], .45), .7); ctx.lineWidth = .7; ctx.stroke();\n}', pal: 'pc.lps' },
  er: { call: 'mER({ lit: 0 })      // js/scenes/molecules.js, lit: 0..1 ER stress (gold)', pal: 'np.er' },
  ribosome: { setup: ['// the S9 schematic pieces (js/scenes/steps.js), flat illustration style'], call: 'flat(() => {\n  ribLarge(0, 32, .88);                 // large subunit\n  ribSmall(0, 46, .88);                 // small subunit\n  mRNA(-176, 150, 40);                  // the strand and its codons\n  tRNA(-55, 14, 1);                     // initiator tRNA on the start codon\n  protein(102, -45, 12);                // the chain coming out (12 amino acids)\n});' },
  ir: { call: 'mIR({ off: 0 })      // js/scenes/molecules.js, off: 0..1 inactive grey', pal: 'np.ir' },
  tnfr1: { call: 'mTNFR1({ bound: 0, lit: 0 })      // js/scenes/molecules.js, bound: chains close on TNF-α, lit: active', pal: 'np.tnfr' },
  syn: { call: 'mSYN({ loss: 0 })      // js/scenes/molecules.js, loss: 0..1 synapse loss', pal: 'np.syn' },
};
/* The source behind each icon, read from the running code (fn.toString()), grouped by file, so it is always the real thing:
   for a cell, the builder that grows its branches, the arbor code that turns them into outlines, the Cell class that draws it,
   the clay shading and the edge texture. */
const SRC = (title, fns) => [title, fns.filter(f => typeof f === 'function')];
const SRC_CELL = builder => [
  SRC('Shape: the branch layout (js/core/builders.js)', [builder, typeof addTw === 'function' ? addTw : null, builder === (typeof buildNeuron === 'function' && buildNeuron) && typeof addP === 'function' ? addP : null]),
  SRC('Outlines: branches to smooth tapered strands and the soma (js/core/arbor.js)', [typeof evalBr === 'function' ? evalBr : null, typeof smoothTo === 'function' ? smoothTo : null, typeof addStrand === 'function' ? addStrand : null, typeof addSoma === 'function' ? addSoma : null]),
  SRC('The cell: building and drawing it (js/core/cell.js)', [Cell]),
  SRC('Shading: rim, body and highlight passes (js/core/kit.js)', [paintMembrane]),
  SRC('Edge texture: the glowing rim (js/scenes/texture.js; texgl.js runs the same maths on the GPU)', [rimEdges]),
];
const SRC_FLUO = [SRC('Stains: pPKR, DAPI and AβO (js/scenes/fluo.js)', [fluoHybrid, fluoGreen, fluoNucAbo, aboPuncta, speckleTile, speckle, blob].filter(f => typeof f === 'function')), SRC('The neuron underneath (js/core/builders.js, js/core/cell.js)', [buildNeuron, Cell])];
const SRC_GLYPH = g => [SRC('The glyph (js/core/glyphs.js)', [g, glyph])];
const SRC_MOL = m => [SRC('The molecule (js/scenes/molecules.js)', [m, nodePal]), SRC('Clay domains and shading (js/core/kit.js)', [dom, paintMembrane])];
const ICON_SRC = {
  astro: () => SRC_CELL(buildAstro), 'astro-a1': () => SRC_CELL(buildAstro), micro: () => SRC_CELL(buildMicro), 'micro-act': () => SRC_CELL(buildMicro),
  neuron: () => SRC_CELL(buildNeuron), 'neuron-lit': () => SRC_CELL(buildNeuron), 'neuron-dying': () => SRC_CELL(buildNeuron), rgc: () => SRC_CELL(buildNeuron), 'rgc-dying': () => SRC_CELL(buildNeuron),
  oligo: () => SRC_CELL(null), 'neuron-abo': () => SRC_CELL(buildNeuron),
  'flh-soft': () => SRC_FLUO, 'flh-bound': () => SRC_FLUO, 'fl-green': () => SRC_FLUO, 'fl-red': () => SRC_FLUO,
  abo: () => SRC_GLYPH(gABO), tnf: () => SRC_GLYPH(gTNF), ab: () => SRC_GLYPH(gAb), tnfb: () => SRC_GLYPH(gBound), il1: () => SRC_GLYPH(gIL1), c1q: () => SRC_GLYPH(gC1q),
  er: () => SRC_MOL(mER), ir: () => SRC_MOL(mIR), tnfr1: () => SRC_MOL(mTNFR1), syn: () => SRC_MOL(mSYN),
  ribosome: () => [SRC('The ribosome, mRNA, tRNA and protein (js/scenes/steps.js)', [cookieFill, ribSmall, ribLarge, mRNA, tRNAPath, tRNA, protAt, protein])],
};
function iconSource(it) {
  const groups = (ICON_SRC[it.id] || (() => []))(), out = [];
  for (const [title, fns] of groups) {
    if (!fns.length) continue;
    out.push('', '', `// ${title}`, '');
    for (const f of fns) { let src = f.toString(); if (/^[\w$]+\s*=>|^\(/.test(src) && f.name) src = `const ${f.name} = ${src};`; out.push(src, ''); }
  }
  return out.join('\n');
}
function iconCode(it) { return iconUsage(it) + iconSource(it); }
function iconUsage(it) {
  const C = ICON_CODE[it.id] || { call: '' }, look = iconLook(it.look || it.id), sep = it.sep ? iconLook(it.sep) : 0, L = [];
  L.push(`// ${it.name}`, '');
  if (C.setup) L.push(...C.setup, '');
  const multi = C.call.includes('\n'), ind = s => s.split('\n').map(x => '    ' + x).join('\n');
  const opts = look ? `{ look: texIdx('${TEX_LOOKS[look]}')${sep ? `, sepLook: texIdx('${TEX_LOOKS[sep]}')` : ''} }` : '';
  L.push('function drawIcon(t) {      // t: time in seconds (the idle motion)');
  if (look) L.push(multi ? `  withClay(ctx, true, () => texPaint(() => {\n${ind(C.call)}\n  }, ${opts}));` : `  withClay(ctx, true, () => texPaint(() => ${C.call.replace(/\s+\/\/.*$/, '')}, ${opts}));${/\/\//.test(C.call) ? '\n  ' + C.call.slice(C.call.indexOf('//')) : ''}`);
  else L.push(multi ? `  withClay(ctx, true, () => {\n${ind(C.call)}\n  });` : `  withClay(ctx, true, () => ${C.call});`);
  L.push('}');
  if (C.pal) {
    const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    if (C.pal === 'fl') L.push('', `// stain colours: pPKR ${hex(FL.green)}, DAPI ${hex(FL.blue)}, AβO ${hex(FL.red)}`);
    else { const v = C.pal.split('.').reduce((o, k) => o && o[k], PALETTES.dark);
      if (Array.isArray(v)) L.push('', `// colour (PALETTES.dark.${C.pal}): ${hex(v)}`);
      else if (v && v.rim) L.push('', `// colours (PALETTES.dark.${C.pal}):`, `//   outline ${hex(v.rim)}, fill ${hex(v.body)}, highlight ${hex(v.fil)}, nucleus ${hex(v.nuc)}`); }
  }
  if (look) L.push(`// texture: '${TEX_LOOKS[look]}'${sep ? ` (its puncta: '${TEX_LOOKS[sep]}')` : ''}`);
  return L.join('\n');
}
// a light syntax highlighter for the code panel (comments, strings, numbers, keywords, calls)
function highlightJS(src) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return src.split('\n').map(line => {
    const ci = (() => { let q = null; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === q) q = null; } else if (ch === "'" || ch === '"') q = ch; else if (ch === '/' && line[i + 1] === '/') return i; } return -1; })();
    const code = ci >= 0 ? line.slice(0, ci) : line, com = ci >= 0 ? line.slice(ci) : '';
    const html = code.split(/('[^']*'|"[^"]*")/).map((part, k) => k % 2 ? `<span class="tk-s">${esc(part)}</span>` :
      esc(part).replace(/\b(const|let|function|new|for|return|true|false)\b/g, '<span class="tk-k">$1</span>').replace(/\b(\d+(?:\.\d+)?|\.\d+)\b/g, '<span class="tk-n">$1</span>').replace(/\b([A-Za-z_]\w*)(?=\()/g, '<span class="tk-f">$1</span>')).join('');
    return html + (com ? `<span class="tk-c">${esc(com)}</span>` : '');
  }).join('\n');
}
// the project texture of an element (look/*.md only: a viewer's own elements-page changes do not count here)
const iconLook = id => { const e = typeof LOOK !== 'undefined' && LOOK.elements && LOOK.elements[id]; return e && e.tex != null ? texIdx(e.tex) : 0; };
// world bounds of an icon, measured once by drawing it plain at a few moments and reading the pixels
const ICON_FIT = {};
function iconFit(it) {
  if (ICON_FIT[it.id]) return ICON_FIT[it.id];
  const S = 900, k = 2, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
  let x0 = S, y0 = S, x1 = 0, y1 = 0; const keep = ctx, keepTex = TEX_EL_ON;
  try {
    TEX_EL_ON = false;
    for (const [t, p] of [[0, false], [0, true], [1.6, true], [3.1, true], [4.7, true]]) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.setTransform(k, 0, 0, k, S / 2, S / 2);
      ctx = g; withClay(g, true, () => it.draw(t, p));
      const d = g.getImageData(0, 0, S, S).data;
      for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  } finally { ctx = keep; TEX_EL_ON = keepTex; }
  if (x1 < x0) { x0 = y0 = S / 2 - 50; x1 = y1 = S / 2 + 50; }
  return ICON_FIT[it.id] = { cx: ((x0 + x1) / 2 - S / 2) / k, cy: ((y0 + y1) / 2 - S / 2) / k, sx: (x1 - x0) / k, sy: (y1 - y0) / k };
}
// paint one icon into a canvas: fitted, transparent background, through its texture
function paintIcon(cv, it, t, playing, margin = 1.16) {
  const g = cv.getContext('2d'), f = iconFit(it), s = Math.min(cv.width / f.sx, cv.height / f.sy) / margin;      // fitted to both sides of the canvas
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(s, 0, 0, s, cv.width / 2 - f.cx * s, cv.height / 2 - f.cy * s);
  const look = iconLook(it.look || it.id), sepLook = it.sep ? iconLook(it.sep) : undefined, keep = ctx, keepTex = TEX_EL_ON;
  ctx = g; TEX_EL_ON = false;
  try {
    const draw = () => withClay(ctx, true, () => it.draw(t, playing));
    if (look > 0 || sepLook > 0) texPaint(draw, { look, px: s, sepLook }); else draw();
  } finally { ctx = keep; TEX_EL_ON = keepTex; }
}
