'use strict';
// Scene 7 data stage: the novel-object-recognition arena that builds Fig. 4A from behaviour, the two-axis
// "dissociation" plot (memory vs IRS-1pSer), and the two hero panels shown side by side.

/* A session is a list of visits [object, share of total exploration]. The shares of each object add up to that group's
   published mean (Fig. 4A), so the bars finish exactly on the published values; the order and length of the individual
   visits are illustrative. */
const NOR_RUN = {
  veh: [['N', .27], ['O', .2], ['N', .22], ['O', .153], ['N', .162]],
  sal: [['O', .2], ['N', .17], ['O', .19], ['N', .156], ['O', .166], ['N', .13]],
};
function norProgress(run, u) {              // u 0..1 through the session → { pos object ('O'|'N'), k within-visit, acc: {O, N} share so far }
  const tot = run.reduce((s, v) => s + v[1], 0), acc = { O: 0, N: 0 }; let x = u * tot, cur = run[run.length - 1][0], k = 1, idx = run.length - 1;
  for (let i = 0; i < run.length; i++) { const [o, d] = run[i]; if (x < d) { acc[o] += x; cur = o; k = x / d; idx = i; x = -1; break; } acc[o] += d; x -= d; }
  const sum = { O: 0, N: 0 }; for (const [o, d] of run) sum[o] += d;
  return { cur, k, idx, fO: acc.O / sum.O, fN: acc.N / sum.N };
}
function mouse(x, y, ang, a, col) {
  if (a <= .004) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= a;
  ctx.strokeStyle = rgb(mix(col, [200, 140, 140], .5)); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.bezierCurveTo(-28, 6, -32, -8, -42, -2); ctx.stroke();   // tail
  ctx.beginPath(); ctx.ellipse(-3, 0, 16, 10.5, 0, 0, TAU); ctx.fillStyle = rgb(col); ctx.fill();                                // body
  ctx.beginPath(); ctx.arc(11, -7.5, 4.6, 0, TAU); ctx.arc(11, 7.5, 4.6, 0, TAU); ctx.fillStyle = rgb(mix(col, [220, 150, 150], .45)); ctx.fill();   // ears
  ctx.beginPath(); ctx.moveTo(8, -7.5); ctx.quadraticCurveTo(27, -4, 27, 0); ctx.quadraticCurveTo(27, 4, 8, 7.5); ctx.closePath(); ctx.fillStyle = rgb(col); ctx.fill();   // head
  ctx.restore();
}
/* The arena, seen from above: familiar object (circle) left, novel object (triangle) right. run: 'veh' | 'sal', u 0..1.
   opt: { oCol, nCol: object colours, labels: false drops 'familiar' / 'novel' (and centres the objects in a shorter arena) } */
const NOR_COL = { old: [226, 128, 34], new: [146, 176, 44] };      // scene 12: familiar = orange, novel = lime (objects, axis labels, the vehicle 'new' bar)
function norArena(R, run, u, a, gt, label, opt = {}) {
  if (a <= .004) return;
  const labs = opt.labels ?? true, oy = labs ? .46 : .5, oc = opt.oCol || COL.teal, nc = opt.nCol || PC.tnf;
  const P = norProgress(NOR_RUN[run], clamp(u)), O = [R.x + R.w * .26, R.y + R.h * oy], N = [R.x + R.w * .74, R.y + R.h * oy];
  ctx.save(); ctx.globalAlpha *= a;
  dataGlass(R.x, R.y, R.w, R.h, 1, 10, false);                  // a darker pane of frosted glass laid over the data panel: no fill, no outline
  // sniffing zones light up while the nose is there
  const exploring = u > 0 && u < 1 && P.k > .16 && P.k < .96;
  for (const [key, p, col] of [['O', O, oc], ['N', N, nc]]) {
    const on = exploring && P.cur === key ? 1 : 0;
    ctx.beginPath(); ctx.arc(p[0], p[1], 40, 0, TAU); ctx.setLineDash([4, 6]); ctx.strokeStyle = rgb(col, .35 + .65 * on); ctx.lineWidth = 2 + on; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.beginPath(); ctx.arc(O[0], O[1], 19, 0, TAU); ctx.fillStyle = rgb(oc); ctx.fill();
  ctx.beginPath(); ctx.moveTo(N[0], N[1] - 22); ctx.lineTo(N[0] + 22, N[1] + 17); ctx.lineTo(N[0] - 22, N[1] + 17); ctx.closePath(); ctx.fillStyle = rgb(nc); ctx.fill();
  if (labs) txt('familiar', O[0], R.y + R.h - 14, { size: 17, w: 600, col: COL.dim, align: 'center' }); if (labs) txt('novel', N[0], R.y + R.h - 14, { size: 17, w: 600, col: COL.dim, align: 'center' });
  // the mouse: walks to the current object over the first 16% of the visit, sniffs, moves on
  const run_ = NOR_RUN[run], prevObj = P.idx > 0 ? run_[P.idx - 1][0] : null, tgt = P.cur === 'O' ? O : N, side = P.cur === 'O' ? 1 : -1;
  const from = prevObj ? (prevObj === 'O' ? [O[0] + 44, O[1] + 26] : [N[0] - 44, N[1] + 26]) : [R.x + R.w * .5, R.y + R.h * .8];
  const at = [tgt[0] + side * 44, tgt[1] + 26], w = ease(seg(P.k, 0, .16));
  let mx = lerp(from[0], at[0], w), my = lerp(from[1], at[1], w) - Math.sin(w * Math.PI) * 14;
  let ang = w < 1 ? Math.atan2(at[1] - from[1], at[0] - from[0]) : Math.atan2(tgt[1] - my, tgt[0] - mx);
  if (w >= 1) { mx += Math.sin(gt * 9) * 2.2; my += Math.cos(gt * 7) * 1.6; ang += Math.sin(gt * 11) * .12; }
  if (u >= 1) { mx = at[0]; my = at[1]; }
  mouse(mx, my, ang, 1, THEME.light ? [150, 158, 168] : [196, 204, 214]);
  if (label) txt(label, R.x + 12, R.y + 26, { size: 19, w: 600, col: COL.text });
  ctx.restore();
  return P;
}
// Fig. 4A as four bars: old/new for vehicle, old/new for salubrinal
const NOR_CH = () => ({ title: 'novel object recognition', unit: 'exploration time (%)', fig: 'redrawn from Fig. 4A', ymax: 80, ticks: [0, 25, 50, 75], dec: 0, ref: { v: 50, label: '50%' },
  n: 10, nUnit: 'mice per group', bars: norBars(DATA.NOR_SALUBRINAL, { subs: [['vehicle', ''], ['salubrinal', '']] }) });

/* Two-axis dissociation plot. p1: x-axis only (memory); p2: the y-axis extends (IRS-1pSer); p3: the AβO arrow. */
function dissociation(R, a, p1, p2, p3) {
  if (a <= .004) return;
  const D = DATA.DISSOCIATION, sal = D.series[0], abo = D.series[1];
  const px = R.x + 78, pw = R.w - 110, y0 = R.y + R.h - 96, ph = R.h - 190;
  const X = v => px + (72 - v) / (72 - 40) * pw, Y = v => y0 - (v - .5) / (2.3 - .5) * ph * p2;        // x runs from good memory (left) to no preference (right)
  ctx.save(); ctx.globalAlpha *= a;
  txt('one manipulation, two readouts', R.x + 4, R.y + 24, { size: 23, w: 600 });
  txt('group means ± SEM, memory: Fig. 4A, 3B, IRS-1pSer: Fig. 5H, 5A', R.x + 4, R.y + 50, { size: 16, w: 500, col: COL.dim });
  // x axis
  ctx.strokeStyle = rgb(COL.ink, .85); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px + pw, y0); ctx.stroke();
  for (const v of [70, 60, 50, 40]) { ctx.beginPath(); ctx.moveTo(X(v), y0); ctx.lineTo(X(v), y0 + 6); ctx.stroke(); txt(String(v), X(v), y0 + 24, { size: 17, w: 500, col: COL.dim, align: 'center' }); }
  txt('time at the novel object (%)', px + pw / 2, y0 + 50, { size: 18, w: 600, align: 'center' });
  txt('remembers', X(68), y0 + 72, { size: 16, w: 500, col: COL.dim, align: 'center' }); txt('no preference', X(50), y0 + 72, { size: 16, w: 500, col: COL.dim, align: 'center' });
  ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = rgb(COL.ink, .6); ctx.beginPath(); ctx.moveTo(X(50), y0); ctx.lineTo(X(50), y0 - 22 - ph * p2); ctx.stroke(); ctx.restore();
  // y axis: extends upward in phase 2
  if (p2 > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(p2 * 3); ctx.strokeStyle = rgb(COL.ink, .85); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 - (ph + 14) * p2); ctx.stroke();
    for (const v of [1, 1.5, 2]) { const yy = Y(v); ctx.beginPath(); ctx.moveTo(px - 6, yy); ctx.lineTo(px, yy); ctx.stroke(); txt(v.toFixed(1), px - 11, yy + 1, { size: 17, w: 500, col: COL.dim, align: 'right', base: 'middle', a: seg(p2, .5, 1) }); }
    ctx.restore();
    txt('IRS-1pSer636 (fold of vehicle)', R.x + 16, y0 - ph / 2, { size: 18, w: 600, align: 'center', rot: -Math.PI / 2, a: seg(p2, .5, 1) });
  }
  const pt = (x, y, col, sx, sy, fill, al = 1) => {
    ctx.save(); ctx.globalAlpha *= al; ctx.strokeStyle = rgb(col); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(X(x - sx), Y(y)); ctx.lineTo(X(x + sx), Y(y)); if (p2 > .9) { ctx.moveTo(X(x), Y(y - sy)); ctx.lineTo(X(x), Y(y + sy)); } ctx.stroke();
    ctx.beginPath(); ctx.arc(X(x), Y(y), 9, 0, TAU); if (fill) { ctx.fillStyle = rgb(col); ctx.fill(); } else { claySuspend(() => { ctx.fillStyle = rgb(COL.bg); ctx.fill(); }); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  };
  const series = (s, col, k, al, lab, ly) => {
    if (al <= .004) return;
    const xx = lerp(s.from.x, s.to.x, k), yy = lerp(s.from.y, s.to.y, k);
    drawEdge([X(s.from.x) + 0, Y(s.from.y)], [X(xx), Y(yy)], { show: 1, solid: 1, a: al * seg(k, .05, .2) }, { w: .8 });
    pt(s.from.x, s.from.y, col, s.xSem[0], s.ySem[0], false, al); pt(xx, yy, col, lerp(s.xSem[0], s.xSem[1], k), lerp(s.ySem[0], s.ySem[1], k), true, al * seg(k, 0, .1));
    txt('vehicle', X(s.from.x), Y(s.from.y) - 20, { size: 16, w: 500, col: COL.dim, align: 'center', a: al * (1 - seg(p3, 0, .3) * (s.key === 'sal' ? 0 : 0)) });
    txt(lab, X(s.to.x) + 4, Y(lerp(s.from.y, s.to.y, k)) + ly, { size: 19, w: 700, col, align: 'center', a: al * seg(k, .7, 1) });
  };
  series(sal, COL.ink, p1, 1, 'salubrinal', -22);
  series(abo, COL.abo, p3, clamp(p3 * 4), 'AβOs (WT)', -24);
  txt('memory moves', px + pw * .5, R.y + 88, { size: 20, w: 600, col: COL.text, align: 'center', a: seg(p1, .8, 1) * (1 - seg(p2, .1, .5)) });
  txt('IRS-1pSer does not follow', px + pw * .5, R.y + 88, { size: 20, w: 600, col: COL.text, align: 'center', a: seg(p2, .8, 1) * (1 - seg(p3, 0, .3)) });
  txt('AβOs move both; salubrinal moves one', px + pw * .5, R.y + 88, { size: 20, w: 600, col: COL.text, align: 'center', a: seg(p3, .6, 1) });
  ctx.restore();
}
// Tier-1 hero panels: Fig. 4A and Fig. 5E-H, large, side by side, over a veil
function heroPanels(a) {
  if (a <= .004) return;
  const A4 = IMG.fig4a, A5 = IMG.fig5eh; if (!A4.naturalWidth || !A5.naturalWidth) return;
  claySuspend(() => { ctx.save(); ctx.globalAlpha *= a * .93; ctx.fillStyle = rgb(COL.bg); ctx.fillRect(0, CROP.y - 6, W, CROP.h + 12); ctx.restore(); });
  const h = 520, w4 = A4.naturalWidth * h / A4.naturalHeight, w5 = A5.naturalWidth * h / A5.naturalHeight, gap = 90, x0 = (W - (w4 + w5 + gap)) / 2, y = 236, k = lerp(.96, 1, eOut(a));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(W / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-W / 2, -(y + h / 2));
  card(x0 - 22, y - 22, w4 + 44, h + 44, 1, { fill: [255, 255, 255], r: 12 }); card(x0 + w4 + gap - 22, y - 22, w5 + 44, h + 44, 1, { fill: [255, 255, 255], r: 12 });
  claySuspend(() => { ctx.drawImage(A4, x0, y, w4, h); ctx.drawImage(A5, x0 + w4 + gap, y, w5, h); });
  txt('memory: impaired', x0 + w4 / 2, y + h + 66, { size: 28, w: 600, align: 'center' }); txt('Fig. 4A, n = 10 mice per group', x0 + w4 / 2, y + h + 98, { size: 20, w: 500, col: COL.dim, align: 'center' });
  txt('IRS-1pSer636: unchanged', x0 + w4 + gap + w5 / 2, y + h + 66, { size: 28, w: 600, align: 'center' }); txt('Fig. 5E-H, culture (n = 3) and mice (n = 7)', x0 + w4 + gap + w5 / 2, y + h + 98, { size: 20, w: 500, col: COL.dim, align: 'center' });
  txt('same drug', x0 + w4 + gap / 2, y + h / 2, { size: 20, w: 600, col: COL.dim, align: 'center', base: 'middle' });
  txt('original panels, Lourenco et al., 2013', W / 2, y - 40, { size: 20, w: 500, col: COL.dim, align: 'center' });
  ctx.restore();
}
