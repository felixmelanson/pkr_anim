'use strict';
// Shared scene furniture: layout, edges with the solid / dashed / struck semantics, legend, bar charts with n-dots,
// receipt panels (the original figure panels), the asymmetry grid, pills and tags.
const LAY = {
  field: { x: 60, y: 168, w: 1240, h: 772 },          // cells (scenes 1-4) / pathway board (5-13)
  chart: { x: 1300, y: 196, w: 566, h: 410 },         // data stage, right column (narrower: the scene gets the width back)
  receipt: { x: 1300, y: 628, w: 566, h: 302 },       // receipts: always this slot (lower right)
  stack: { x: 1500, w: 372, y: [176, 566], h: 372 },  // scene 4: two charts stacked in a slim column
  grid: { w: 786, h: 190 },                           // asymmetry table (drawn at 1.62× on its glass panel, centre stage)
  legend: { x0: 1328, y0: 315, x1: 1082, y1: 846 },   // edge legend: centred inside the live data panel / beside the Fig. 7 layout
};
const A = (t, a, b) => ease(seg(t, a, b));
const hold = (t, a, b, c, d) => ease(seg(t, a, b)) * (1 - ease(seg(t, c, d)));   // in over [a,b], out over [c,d]

/* edges */
// An edge is a quadratic from a to b (bend = sideways offset of the control point, px).
function edgeGeom(a, b, bend = 0, ctl = null) {      // ctl: an explicit control point instead of the sideways bend
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  if (ctl) return { x0: a[0], y0: a[1], cx: ctl[0], cy: ctl[1], x1: b[0], y1: b[1], len: l };
  return { x0: a[0], y0: a[1], cx: mx - dy / l * bend, cy: my + dx / l * bend, x1: b[0], y1: b[1], len: l };
}
function edgePt(g, u) { const v = 1 - u; return [v * v * g.x0 + 2 * v * u * g.cx + u * u * g.x1, v * v * g.y0 + 2 * v * u * g.cy + u * u * g.y1]; }
function edgeDir(g, u) { const dx = 2 * (1 - u) * (g.cx - g.x0) + 2 * u * (g.x1 - g.cx), dy = 2 * (1 - u) * (g.cy - g.y0) + 2 * u * (g.y1 - g.cy), l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
function edgeStroke(g, u0, u1) { const n = 28; ctx.beginPath(); for (let i = 0; i <= n; i++) { const p = edgePt(g, lerp(u0, u1, i / n)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
function arrowHead(g, u, size, col, a) {
  const p = edgePt(g, u), d = edgeDir(g, Math.min(.999, u));
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.atan2(d[1], d[0])); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.moveTo(size * .55, 0); ctx.lineTo(-size * .6, -size * .52); ctx.lineTo(-size * .32, 0); ctx.lineTo(-size * .6, size * .52); ctx.closePath();
  ctx.fillStyle = rgb(col); ctx.fill(); ctx.restore();
}
/* state: show 0..1 (the proposed, dashed grey edge draws on), solid 0..1 (ink draws over it once an experiment supports it),
   strike 0..1 (ruled out: the line goes grey and a double bar is struck across it). o.a alpha, o.w width scale,
   o.pulse 0..1 travelling signal dots, o.label / o.labelA text at the midpoint, o.thin for secondary edges. */
function drawEdge(a, b, st, o = {}) {
  const show = st.show || 0, solid = st.solid || 0, strike = st.strike || 0, al = (o.a ?? 1) * (st.a ?? 1);
  if (al <= .004 || (show <= .004 && solid <= .004)) return;
  const g = edgeGeom(a, b, o.bend || 0, o.ctl), k = o.w || 1, head = 15 * k * (o.thin ? .8 : 1);
  const uEnd = 1 - head * .5 / Math.max(40, g.len);                       // stop the line inside the arrowhead
  ctx.save(); ctx.globalAlpha *= al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const grey = COL.edgeDash, ink = mix(COL.edge, grey, strike * .85);
  if (show > solid) {                                                    // the proposed (dashed, grey) part not yet covered by ink
    ctx.save(); ctx.setLineDash([11 * k, 9 * k]); ctx.strokeStyle = rgb(grey); ctx.lineWidth = (o.thin ? 2.4 : 3.4) * k;
    edgeStroke(g, solid * uEnd, show * uEnd); ctx.restore();
    arrowHead(g, show * uEnd + (1 - uEnd) * show, head * .9, grey, seg(show, .1, .4) * (1 - seg(solid, .8, 1)));
  }
  if (solid > 0) {
    ctx.strokeStyle = rgb(ink); ctx.lineWidth = (o.thin ? 3 : 4.6) * k; edgeStroke(g, 0, solid * uEnd);
    arrowHead(g, solid * uEnd + (1 - uEnd) * solid, head, ink, 1);
  }
  if (o.pulse > .01 && solid >= 1 && strike < .5) {                      // signal moving along a supported edge
    const gt = o.gt || 0;
    for (let i = 0; i < 2; i++) { const u = ((gt * .32 + i * .5 + (o.ph || 0)) % 1 + 1) % 1; const p = edgePt(g, u * uEnd); ctx.beginPath(); ctx.arc(p[0], p[1], 5.2 * k, 0, TAU); ctx.fillStyle = rgb(PC.phos, 1); ctx.globalAlpha = al * o.pulse * Math.sin(Math.PI * u); ctx.fill(); }
    ctx.globalAlpha = al;
  }
  if (strike > 0) {                                                      // ruled out: double bar across the midpoint
    const um = o.strikeAt ?? .5, p = edgePt(g, um * uEnd), d = edgeDir(g, um), L = 19 * k * eOut(strike);
    ctx.strokeStyle = rgb(COL.edge); ctx.lineWidth = 5 * k;
    for (const s of [-1, 1]) { const ox = d[0] * 6.5 * k * s, oy = d[1] * 6.5 * k * s, nx = -d[1] * .9 + d[0] * .42, ny = d[0] * .9 + d[1] * .42; ctx.beginPath(); ctx.moveTo(p[0] + ox - nx * L, p[1] + oy - ny * L); ctx.lineTo(p[0] + ox + nx * L, p[1] + oy + ny * L); ctx.stroke(); }
  }
  ctx.restore();
  if (o.label && (o.labelA ?? 1) > 0) { const p = edgePt(g, o.labelAt ?? .5), d = edgeDir(g, .5); txt(o.label, p[0] - d[1] * (o.labelOff ?? 22), p[1] + d[0] * (o.labelOff ?? 22), { size: o.labelSize || 19, w: 500, col: o.labelCol || COL.dim, align: 'center', base: 'middle', a: al * (o.labelA ?? 1), halo: 6 }); }
}
// shorten a→b so the edge starts / ends at the rims of its nodes
function between(a, ra, b, rb) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; if (ra + rb > l - 10) { const k = Math.max(0, l - 10) / (ra + rb); ra *= k; rb *= k; }      // never let the trimmed ends cross (the arrowhead flipped mid-morph)
   return [[a[0] + dx / l * ra, a[1] + dy / l * ra], [b[0] - dx / l * rb, b[1] - dy / l * rb]]; }

/* legend */
// Three edge states. No card: it sits on the page, bottom left of the right column, and glides beside the board when the
// board takes the Fig. 7 layout (lay 1). Appears with the pathway board (scene 5), not before.

/* The legend as one horizontal bar on a darkened frosted-glass panel, bottom centre. Same glyphs and sizes as the old stacked one.
   S.legendH 0..1: revealed in step 7 (after the zoom back into the culture), held through step 14, gone in step 15. */
const LEG_ROWS = [['supported by experiment', { show: 1, solid: 1 }], ['proposed, not yet shown', { show: 1 }], ['tested and ruled out', { show: 1, solid: 1, strike: 1 }]];
function legendRect() {      // the legend bar's glass, also used to align the scene 8-10 panels to its edges
  const lf = { size: 26, w: 700 }, tf = { size: 26, w: 500 }, E = 80, g1 = 30, gap = 64, pad = 46, lw = txtW('Arrow Legend:', lf) + 50;
  const widths = LEG_ROWS.map(r => E + g1 + txtW(r[0], tf)), tot = lw + widths.reduce((s, w) => s + w, 0) + gap * (LEG_ROWS.length - 1);
  const w = tot + pad * 2, h = 80;      // bottom fixed; contents centred
  return { x: W / 2 - w / 2, y: H - 36 - h, w, h, lf, tf, E, g1, gap, pad, lw, widths };
}
function legendBar(S) {
  const a = S.legendH || 0; if (a <= .004) return;
  const rows = LEG_ROWS, { x: x0, y: y0, w, h, lf, tf, E, g1, gap, pad, lw, widths } = legendRect(), cy = y0 + h / 2 + 1;      // contents (text with descenders, arrows) centred on the glass: measured, see pixel check
  dataGlass(x0, y0, w, h, a, 8, false);      // corner radius matches the scene-7 verdict panel. Plain frosted glass everywhere (no tint change mid-clip)
  ctx.save(); ctx.globalAlpha *= a;
  txt('Arrow Legend:', x0 + pad, cy, { ...lf, col: COL.text, base: 'middle' });
  let x = x0 + pad + lw;
  rows.forEach(([s, st], i) => { drawEdge([x, cy], [x + E, cy], st, { w: 1.15 }); txt(s, x + E + g1, cy, { ...tf, col: COL.legend, base: 'middle' }); x += widths[i] + gap; });
  ctx.restore();
}

/* small parts */
// methods footnote under a chart: one or more dim lines, left-aligned, each shrunk to fit maxW. y = baseline of the LAST line.
const FOOT_SIZE = 19, FOOT_LH = 25;
function figFoot(lines, x, y, maxW, a, o = {}) {
  if (a <= .004) return; const ls = [].concat(lines), lh = o.lh || FOOT_LH;
  const f = { size: o.size || FOOT_SIZE, w: 500, col: COL.dim, a, align: o.align || 'left' }, k = Math.min(1, ...ls.map(s => maxW / txtW(s, f)));      // one shrink for every line: they stay the same size
  ls.forEach((s, i) => txt(s, x, y - (ls.length - 1 - i) * lh, { ...f, size: f.size * k }));
}
const figFootH = (n, o = {}) => (n - 1) * (o.lh || FOOT_LH) + (o.size || FOOT_SIZE);      // height of an n-line footnote, top of line 1 to the last baseline
function txtFit(s, x, y, o, maxW) { const k = Math.min(1, maxW / txtW(s, o)); txt(s, x, y, { ...o, size: (o.size || 20) * k }); }      // text shrunk to fit a width
function pBadge(x, y, r, a = 1) {            // the phospho-mark, one accent colour everywhere
  if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = rgb(PC.phos); ctx.fill();
  ctx.lineWidth = Math.max(1, r * .14); ctx.strokeStyle = rgb(mix(PC.phos, [0, 0, 0], .35), .7); ctx.stroke();
  ctx.restore();
  // centre the letter's own ink box on the disc ('middle' and 'center' centre the em box, which sat the P low and right)
  ctx.save(); ctx.globalAlpha *= a; ctx.font = `700 ${r * 1.25}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgb(0,0,0)';
  const m = ctx.measureText('P');
  ctx.fillText('P', x - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  ctx.restore();
}
// intervention pill: ink capsule with the agent's name, optional dose line under it
function pill(s, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= .004) return;
  const size = o.size || 21, w = txtW(s, { size, w: 600 }) + size * 1.3, h = size * 1.7;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = rgb(o.col || PC.drug); ctx.fill();
  ctx.restore();
  txt(s, x, y + 1, { size, w: 600, col: o.tcol || COL.bg, align: 'center', base: 'middle', a });
  if (o.sub) txt(o.sub, x, y + h / 2 + size * .85, { size: size * .78, w: 500, col: COL.dim, align: 'center', base: 'middle', a, halo: 5 });
  return w;
}
function tag(s, x, y, o = {}) { txt(s, x, y, { size: 20, w: 500, col: COL.text, align: 'center', base: 'middle', halo: 6, ...o }); }
function glassTag(s, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= .004) return;
  const size = 38, align = o.align || 'center';
  const text = { ...o, size: o.fs || size, align, base: 'middle', halo: 0 };      // o.fs: a smaller text size (the panel keeps its 38 px height)
  const label = o.parts ? o.parts.map(p => p.text).join('') : s;
  const w = o.boxW || txtW(label, text) + size * 3.2, h = size * 2.25;      // o.boxW: a fixed panel width; o.noBox: text only; o.textA: the text's own alpha
  const left = align === 'left' ? x - size * .9 : align === 'right' ? x - w + size * .9 : x - w / 2;
  if (!o.noBox) glassPanel(left, y - h / 2 - size * .12, w, h, Math.min(8, h * .16), a);
  if (!label || (o.textA ?? 1) <= .004) return; const tA = o.textA ?? 1;
  const drawText = (ox, oy, shadow) => {
    if (!o.parts) { txt(label, x + ox, y + oy, { ...text, col: shadow ? mix(COL.bg, COL.ink, .5) : (o.col || COL.text), a: (shadow ? a * .7 : a) * tA }); return; }
    const total = txtW(label, text), start = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
    let px = start;
    for (const part of o.parts) {
      txt(part.text, px + ox, y + oy, { ...text, align: 'left', col: shadow ? mix(COL.bg, COL.ink, .5) : (part.col || o.col || COL.text), a: (shadow ? a * .7 : a) * tA });
      px += txtW(part.text, text);
    }
  };
  drawText(0, 0, false);
}
// soft card behind charts / receipts (flat: it is background-sized, so clay leaves it alone; shadow drawn by hand)
function card(x, y, w, h, a = 1, o = {}) {
  if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a;
  claySuspend(() => {
    ctx.save(); ctx.shadowColor = THEME.light ? 'rgba(20,32,44,.16)' : 'rgba(0,0,0,.7)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? 14); ctx.fillStyle = rgb(o.fill || COL.panel); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? 14); ctx.strokeStyle = rgb(COL.panelRim, .9); ctx.lineWidth = 1.5; ctx.stroke();
  });
  ctx.restore();
}

/* bar charts */
/* D: { title, unit, ymax, ticks, bars: [{ label, sub, mean, sem, open, col, star, gap }], ref: { v, label }, n, fig }
   o: { a, grow: number | i => 0..1, sem, star, dots: 0..1, val: bool }  Every bar is mean ± SEM; n is drawn as dots
   under the bar (group size only: the paper does not publish individual values). */
/* D: { title, unit, ylab (y-axis title, drawn rotated along the axis as in the paper), ymax, ticks, fig, note (one line under the
        chart), bars: [{ label, sub, mean, sem, open, col, star, gap, a }], ref: { v, label }, n, nUnit,
        matrix: [{ name, vals: ['−', '+', …] }] condition rows under the bars (replaces the bar labels, as the paper prints them),
        groups: [{ label, from, to }] bracket labels under the matrix }
   o: { a, grow: number | i => 0..1, sem, star, val: bool, lab, barA: i => 0..1 }  Every bar is mean ± SEM. */
function barChart(R, D, o = {}) {
  const a = o.a ?? 1; if (a <= .004) return;
  const bars = D.bars, nb = bars.length, compact = R.h < 300 || R.w / nb < 46, mx = D.matrix, rowH = 30;
  const note = D.note || (D.n ? `mean ± SEM, n = ${D.n}${D.nUnit ? ' ' + D.nUnit : ''}` : '');
  const ylabs = D.ylab ? [].concat(D.ylab) : [], padL = D.ylab ? 92 + (ylabs.length - 1) * 24 : 62, padT = D.title ? (D.unit ? 62 : 48) : 26, padR = D.ref ? 58 : 16;
  const padB = (mx ? 22 + mx.length * rowH : (bars.some(b => b.sub) ? 62 : 40)) + (D.groups ? 44 + (D.groups.some(g => g.sub) ? 24 : 0) : 0) + (note ? 34 : 6);
  const px = R.x + padL, py = R.y + padT, pw = R.w - padL - padR, ph = R.h - padT - padB, y0 = py + ph;
  const Y = v => y0 - v / D.ymax * ph;
  const gaps = bars.reduce((s, b) => s + (b.gap || 0), 0), slot = (pw - gaps * 26) / nb, bw = Math.min(slot * .68, 86);
  const grOf = i => typeof o.grow === 'function' ? o.grow(i) : (o.grow ?? 1), baOf = i => (bars[i].a ?? 1) * (o.barA ? o.barA(i) : 1);
  const cxs = []; { let bx = px; bars.forEach((b, i) => { if (b.gap) bx += 26 * b.gap; cxs.push(bx + slot / 2); bx += slot; }); }
  ctx.save(); ctx.globalAlpha *= a;
  if (D.title) txt(D.title, R.x + 4, R.y + 24, { size: 23, w: 600 });
  if (D.unit) txt(D.unit, R.x + 4, R.y + 50, { size: 18, w: 500, col: COL.dim });
  if (D.fig) txt(D.fig, R.x + R.w - 4, R.y + 24, { size: 18, w: 500, col: COL.dim, align: 'right' });
  ylabs.forEach((s, i) => txt(s, R.x + 24 + i * 24, py + ph / 2, { size: o.ylabSize || 21, w: 500, align: 'center', base: 'middle', rot: -Math.PI / 2 }));      // ylab may be [line 1, line 2]: two rotated lines, the first outermost
  // bars first, clipped at the baseline so neither the fill nor its clay shadow spills under the axis; the axis is drawn over them
  ctx.save(); ctx.beginPath(); ctx.rect(px - 20, R.y - 60, pw + 60, y0 - (R.y - 60)); ctx.clip();
  bars.forEach((b, i) => {
    const cx = cxs[i], gr = grOf(i), top = Y(b.mean * gr), ba = baOf(i); if (gr <= .002 || ba <= .004) return;
    const col = b.col || COL.ink;
    ctx.save(); ctx.globalAlpha *= ba;
    ctx.beginPath(); ctx.rect(cx - bw / 2, top, bw, Math.max(1, y0 - top) + 14);
    if (b.open) { claySuspend(() => { ctx.fillStyle = rgb(COL.bg, .35); ctx.fill(); }); ctx.strokeStyle = rgb(col); ctx.lineWidth = 2.6; ctx.lineJoin = 'miter'; ctx.strokeRect(cx - bw / 2 + 1.3, top + 1.3, bw - 2.6, Math.max(1, y0 - top - 1.3) + 14); }
    else { ctx.fillStyle = rgb(col, b.colA ?? .92); ctx.fill(); }
    ctx.restore();
  });
  ctx.restore();
  // axis
  ctx.strokeStyle = rgb(COL.ink, 1); ctx.lineWidth = 2.4; ctx.lineCap = 'butt';
  claySuspend(() => { ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px, y0); ctx.lineTo(px + pw, y0); ctx.stroke(); });
  ctx.strokeStyle = rgb(COL.ink, .85); ctx.lineWidth = 2;
  for (const v of D.ticks) { const yy = Y(v); ctx.beginPath(); ctx.moveTo(px - 6, yy); ctx.lineTo(px, yy); ctx.stroke(); txt(String(v), px - 11, yy + 1, { size: 19, w: 500, col: COL.dim, align: 'right', base: 'middle' }); }
  if (D.ref) {
    const ra = o.ref ?? 1, yy = Y(D.ref.v);
    ctx.save(); ctx.globalAlpha *= ra; ctx.setLineDash([7, 6]); ctx.strokeStyle = rgb(COL.ink, .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw + 6, yy); ctx.stroke(); ctx.restore();
    txt(D.ref.label, px + pw + 10, yy + 1, { size: 18, w: 600, col: COL.text, base: 'middle', a: ra });
  }
  bars.forEach((b, i) => {
    const cx = cxs[i], gr = grOf(i), v = b.mean * gr, top = Y(v), ba = baOf(i);
    const la = (typeof o.lab === 'function' ? o.lab(i) : (o.lab ?? 1)) * ba;
    ctx.save(); ctx.globalAlpha *= ba;
    const sa = (typeof o.sem === 'function' ? o.sem(i) : (o.sem ?? 1)) * (gr >= .999 ? 1 : 0);
    if (b.sem && sa > 0) {
      const t2 = Y(b.mean + b.sem * sa);
      ctx.strokeStyle = rgb(COL.ink); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, t2); ctx.moveTo(cx - bw * .26, t2); ctx.lineTo(cx + bw * .26, t2); ctx.stroke();
    }
    const st = (typeof o.star === 'function' ? o.star(i) : (o.star ?? 1));
    if (b.star && st > 0) txt(b.star, cx, Y(b.mean + (b.sem || 0)) - 8, { size: 32, w: 600, align: 'center', a: st });
    if (o.val && gr > .02) txt(o.val === true ? v.toFixed(D.dec ?? 1) : o.val(i, v), cx, top - 10, { size: 19, w: 600, align: 'center', a: 1 - sa, col: COL.text });
    ctx.restore();
    if (mx) mx.forEach((row, r) => txt(row.vals[i], cx, y0 + 38 + (o.mxDy || 0) + r * rowH, { size: 24, w: 600, align: 'center', a: la }));
    else {
      txt(b.label, cx, y0 + 25 + (o.labDy || 0), { size: o.labSize || (compact ? 17 : 19), w: 600, align: 'center', a: la, col: b.lcol || COL.text });
      if (b.sub) txt(b.sub, cx + (b.subDx || 0) * slot, y0 + 47, { size: b.subSize || (compact ? 15 : 17), w: 500, align: 'center', col: COL.dim, a: la });
    }
  });
  if (mx) mx.forEach((row, r) => txt(row.name, px - 12, y0 + 38 + (o.mxDy || 0) + r * rowH, { size: 20, w: 600, align: 'right', col: COL.text }));
  if (D.groups) for (const g of D.groups) {            // a line under each group of bars, the group's name centred below it
    const x0 = cxs[g.from] - bw / 2, x1 = cxs[g.to] + bw / 2, yy = y0 + (mx ? 30 + mx.length * rowH : 40), ga = Math.min(baOf(g.from), baOf(g.to)) * (g.a ?? 1);
    ctx.save(); ctx.globalAlpha *= ga; ctx.strokeStyle = rgb(COL.ink, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.restore();
    txt(g.label, (x0 + x1) / 2, yy + 27, { size: 21, w: 600, align: 'center', a: ga });
    if (g.sub) txt(g.sub, (x0 + x1) / 2, yy + 51, { size: 19, w: 500, align: 'center', col: COL.dim, a: ga });      // a second line under the group name (WT / vehicle)
  }
  if (note) txt(note, R.x + 4, R.y + R.h - 6, { size: 17, w: 500, col: COL.dim });
  if (o.figTag) txt(o.figTag, px + pw, py - 4, { size: o.figTagSize || 20, w: 600, col: COL.dim, align: 'right', base: 'top' });      // figure number inside the plot: right edge on the x axis's end, top on the y axis's top
  ctx.restore();
}
/* A dark, tinted frosted-glass slab for data: the scene behind it blurred and dimmed, so white-on-dark charts read on top of
   anything (cells, cytoplasm). */
function dataGlass(x, y, w, h, a, r = 22, tint = true) {      // tint: strength of the dark fill, 0..1 (true = 1; false / 0 = plain frosted glass)
  if (a <= .004) return;
  claySuspend(() => { ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.roundRect(x, y, w, h, r); ctx.clip('evenodd'); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 12; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); });
  glassPanel(x, y, w, h, r, a);
  claySuspend(() => { ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); const tk = tint === true ? 1 : +tint || 0; if (tk > .004) { ctx.fillStyle = THEME.light ? `rgba(255,255,255,${.55 * tk})` : `rgba(6,9,14,${.62 * tk})`; ctx.fill(); } ctx.strokeStyle = THEME.light ? 'rgba(20,32,44,.14)' : 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); });
}
// NOR panel → bars: each group is an open "old" bar and a solid "new" bar
function norBars(P, o = {}) {
  const bars = [];
  P.groups.forEach((g, i) => {
    bars.push({ label: 'old', sub: o.subs ? o.subs[i][0] : g.label, mean: g.old, sem: g.oldSem, open: true, gap: i ? 1 : 0, lcol: COL.dim });
    bars.push({ label: 'new', sub: o.subs ? o.subs[i][1] : (g.sub || ''), mean: g.nov, sem: g.novSem, star: g.star });
  });
  return bars;
}

/* receipts: the original panel, small, always in the same slot */
function receipt(key, a, label, R = LAY.receipt, o = {}) {
  if (a <= .004) return;
  const im = IMG[key]; if (!im || !im.naturalWidth) return;
  const k = lerp(.94, 1, eOut(a)), pad = 12, lh = 30;
  const s = Math.min((R.w - pad * 2) / im.naturalWidth, (R.h - pad * 2 - lh) / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
  const cw = Math.max(w + pad * 2, o.minW || 0), ch = h + pad * 2 + lh, cx = o.left ? R.x : R.x + R.w - cw, cy = o.top ? R.y : R.y + R.h - ch;
  ctx.save(); ctx.globalAlpha *= clamp(a * 1.4);
  ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(k, k); ctx.translate(-cw / 2, -ch / 2);
  card(0, 0, cw, ch, 1, { fill: [255, 255, 255], r: 10 });
  claySuspend(() => ctx.drawImage(im, (cw - w) / 2, pad, w, h));
  txt(label, pad, ch - 11, { size: 17, w: 600, col: [70, 82, 96] });
  txt('original panel', cw - pad, ch - 11, { size: 15, w: 500, col: [120, 132, 144], align: 'right' });
  ctx.restore();
}

/* the asymmetry grid (a figure the paper does not contain) */
const GRID_ROWS = [
  { k: 'tnfr', label: 'remove TNFR1', sub: 'TNFR1−/−' },
  { k: 'pkr', label: 'remove PKR', sub: 'PKR−/−' },
  { k: 'sal', label: 'force eIF2α-P', sub: 'salubrinal' },
  { k: 'thaps', label: 'force ER stress', sub: 'thapsigargin' },
];
const GRID_CELLS = {      // [text, on?] ; on = the pathology readout is present (gold), otherwise grey
  tnfr: [['blocked', 0, 'Fig. 3B-F'], ['blocked', 0, 'Fig. 5A']],
  pkr: [['blocked', 0, 'Fig. 3G-I'], ['reduced †', 0, 'Fig. 5B']],
  sal: [['OCCURS', 1, 'Fig. 4A-H'], ['does NOT occur', 0, 'Fig. 5E-H']],
  thaps: [['occurs ‡', 1, 'Fig. S5C-D'], ['OCCURS', 1, 'Fig. 5C-D']],
};
/* Frosted glass: whatever is already on the canvas behind the panel, blurred, under a thin tint, a top sheen and a hairline
   rim. Drawn in device pixels (the canvas is copied onto itself through a blur filter, clipped to the panel). */
function glassPanel(x, y, w, h, r, a) {
  if (a <= .004) return;
  const c = ctx, m = c.getTransform(), k = Math.hypot(m.a, m.b), light = THEME.light;
  claySuspend(() => {
    c.save(); c.globalAlpha *= a;
    c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
    { // blur only what is behind the panel (plus a margin for the blur to draw on), not the whole canvas: the filter's cost follows the area drawn
      const bp = 14 * k, pad = Math.ceil(bp * 3), cw = c.canvas.width, ch = c.canvas.height;
      const sx = Math.max(0, Math.floor(m.a * x + m.e - pad)), sy = Math.max(0, Math.floor(m.d * y + m.f - pad)), sw = Math.min(cw - sx, Math.ceil(w * k + pad * 2)), sh = Math.min(ch - sy, Math.ceil(h * k + pad * 2));
      if (sw > 0 && sh > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); drawFiltered(c, `blur(${bp.toFixed(1)}px) saturate(1.35)`, c.canvas, sx, sy, sw, sh, sx, sy, sw, sh); c.restore(); } }
    c.restore();
    c.beginPath(); c.roundRect(x + .75, y + .75, w - 1.5, h - 1.5, r); c.strokeStyle = light ? 'rgba(20,32,44,.12)' : 'rgba(255,255,255,.16)'; c.lineWidth = 1.2; c.stroke();
    c.restore();
  });
}
/* G: { cells: { tnfr: [c0, c1], … } with 0..1 fill-in, big: 0..1 (presence), hot: row key being filled }
   The table is no longer a persistent HUD: it is built as a centrepiece, on a frosted glass panel over the whole scene,
   each time a row is earned (G.big rises, the row fills, G.big falls). */
function asymGrid(G) {
  const big = G ? (G.big || 0) : 0; if (big <= .004) return;
  const W0 = LAY.grid.w, H0 = LAY.grid.h, sc = 1.62 * lerp(.955, 1, eOut(big)), x = 960 - W0 * sc / 2, y = 484 - H0 * sc / 2, a = clamp(big * 1.25);
  claySuspend(() => { ctx.save(); ctx.globalAlpha *= a * (THEME.light ? .5 : .74); ctx.fillStyle = rgb(COL.bg); ctx.fillRect(0, 0, W, H); ctx.restore(); });   // the scene steps well back
  { const gx = x - 44 * sc / 1.62, gy = y - 40 * sc / 1.62, gw = W0 * sc + 88 * sc / 1.62, gh = H0 * sc + 80 * sc / 1.62;      // soft shadow around (not under) the glass
    claySuspend(() => { ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.roundRect(gx, gy, gw, gh, 30); ctx.clip('evenodd'); ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 24; ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 30); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); }); }
  glassPanel(x - 44 * sc / 1.62, y - 40 * sc / 1.62, W0 * sc + 88 * sc / 1.62, H0 * sc + 80 * sc / 1.62, 30, a);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  const cL = 262, cw = (W0 - cL) / 2, hH = 38, rh = (H0 - hH) / 4;
  txt('synapse loss / memory', cL + cw / 2, 25, { size: 19, w: 600, align: 'center' });
  txt('IRS-1 inhibition', cL + cw * 1.5, 25, { size: 19, w: 600, align: 'center' });
  GRID_ROWS.forEach((r, i) => {
    const yy = hH + i * rh, hot = G.hot === r.k ? 1 : 0;
    ctx.strokeStyle = rgb(COL.ink, .14); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W0, yy); ctx.stroke();
    txt(r.label, 6, yy + rh / 2 + 1, { size: 19, w: 600, base: 'middle', col: COL.text });
    txt(r.sub, cL - 12, yy + rh / 2 + 1, { size: 15, w: 500, base: 'middle', col: COL.dim, align: 'right' });
    for (let c = 0; c < 2; c++) {
      const f = (G.cells[r.k] || [0, 0])[c] || 0, [s, on, fig] = GRID_CELLS[r.k][c], cx = cL + c * cw;
      // empty cells stay visibly empty
      ctx.beginPath(); ctx.roundRect(cx + 5, yy + 4, cw - 10, rh - 8, 7); ctx.setLineDash([5, 5]); ctx.strokeStyle = rgb(COL.edgeDash, .7 * (1 - f)); ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
      if (f > 0) {
        const e = eOut(f);
        ctx.save(); ctx.globalAlpha *= clamp(f * 2);
        ctx.beginPath(); ctx.roundRect(cx + 5, yy + 4, (cw - 10) * e, rh - 8, 7); ctx.fillStyle = rgb(on ? mix(COL.bg, PC.phos, THEME.light ? .5 : .62) : mix(COL.bg, PC.gray, THEME.light ? .32 : .5)); ctx.fill();
        ctx.restore();
        txt(s, cx + cw / 2 - 34, yy + rh / 2 + 1, { size: 18.5, w: 700, align: 'center', base: 'middle', col: on ? (THEME.light ? [70, 42, 0] : [255, 236, 190]) : COL.text, a: seg(f, .45, 1) });
        txt(fig, cx + cw - 12, yy + rh / 2 + 1, { size: 12.5, w: 500, align: 'right', base: 'middle', col: COL.dim, a: seg(f, .45, 1) });
      }
    }
  });
  ctx.restore();
}
