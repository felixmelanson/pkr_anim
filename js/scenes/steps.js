'use strict';
/* The thirteen steps as one state machine.
   S is a plain object (camera, what is lit, every edge's show / solid / strike, the grid cells…). Each step has
     apply(S, t)   moves S from the previous step's end state to where this step is at t seconds (pure, eased), and
     over(S, t, gt) draws what belongs to this step only: charts, receipts, tags.
   The state at (step k, t) = apply_k(end state of step k-1, t), so a clip always opens exactly where the last one ended. */
const EKEYS = ['abo_tnf', 'abo_dir', 'tnf_tnfr', 'tnfr_pkr', 'pkr_eif', 'pkr_irs', 'eif_syn', 'syn_mem', 'eif_irs', 'er_irs', 'er_eif', 'irs_mem', 'jnk'];
function S_INIT() {
  const e = {}; for (const k of EKEYS) e[k] = { show: 0, solid: 0, strike: 0 };
  return {
    cam: { x: BR_CAM[0], y: BR_CAM[1], z: BR_Z, ax: FC.x, ay: FC.y, track: 0, rotK: 0 }, cultA: 1, boardA: 0, nodesA: 1, flat: 1, beads: 1, cyt: 1, ghost: 0, legend: 0, legendH: 0, dirA: 1, eifIrsA: 1, erA: 1, swarmA: 1,
    br: { astA: 1, astR: 0, astDash: 0, cyt: 0, cytA: 1, tnfP: 0, tnfA: 1, kill: 0, layN: 1, layM: 1, layM0: 1, rgc: 1, rgcA: 1, blur: 1, lip: 0, revL: 0 }, spread: 0, lost: 0, focus: 0, vivo: { a: 0, left: 0, k: 1, c: 0 },
    dish: { on: 0, iris: 0, sep: 0, tilt: 0, lab: 0, inf: 0, rA: 1, home: DISH.mid },
    aboMed: 0, aboBind: 0, ppkr: 0, tnfMed: 0, micro: .8, split: 0, inflix: 0,
    tis: { a: 0, lab: 1, dir: { show: 0, solid: 0, strike: 0 }, relay: { show: 0, solid: 0 }, tnfN: { show: 0, solid: 0 } },
    conf: { a: 0, r: 0, g: 0, b: 0, arrow: 0, box: 0, lab: 1 }, blurUnbound: 0,
    lay: 0, micTag: 0, dagger: 0, dimEdges: {},
    n: { abo: { a: 0 }, tnf: { a: 0, up: 0 }, tnfr: { a: 0, bound: 0, lit: 0 }, ir: { a: 0 }, pkr: { a: 0, lit: 0 }, irs: { a: 0, lit: 0 }, eif: { a: 0, lit: 0 },
         syn: { a: 0, loss: 0 }, mem: { a: 0, loss: 0 }, er: { a: 0, lit: 0 }, jnk: { a: 0 }, ribo: { a: 0, stall: 0 } },
    e, grid: { big: 0, hot: null, cells: { tnfr: [0, 0], pkr: [0, 0], sal: [0, 0], thaps: [0, 0] } },
  };
}
// move one field toward a target by an eased fraction k (0..1). S is a fresh copy every frame, so this lerps from the step's start value.
const mv = (o, key, target, k) => { o[key] = lerp(o[key] || 0, target, k); };
const mvs = (o, targets, k) => { for (const key in targets) mv(o, key, targets[key], k); };

const STEPDEF = {};
const BR_Z = 1.8, BR_CAM = [442, 452], COLD_CAM = [HEROXY[0] + 34, HEROXY[1] - 46];   // bridge starts wide on the astrocyte, ends exactly on scene 1's opening frame

/* 0a / 0b. Bridge from the astrocyte talk (Liddelow et al. 2017): TNF-α is the shared messenger
   0a  the previous talk in one beat: microglia → IL-1α, TNF-α, C1q → astrocyte turns A1 → the retinal ganglion cell degrades. Stops there.
   0b  the A1 change runs backwards while IL-1α and C1q go; then the camera moves, the astrocyte becomes a dashed outline,
       and TNF-α alone travels on to the pyramidal neuron. */
function bridgeLabels(S, t, o) {            // o: alphas { mic, ast, a1, rgc, pyr, lip, tnf }
  const z = S.cam.z, k = z / BR_Z, lm = S.br.layM;
  const m = toScreen(S, MIC_AT[1][0] + MIC_OFF[1][0] * lm + BR_DEBUG.component.microglia[0] * lm, MIC_AT[1][1] + MIC_OFF[1][1] * lm + BR_DEBUG.component.microglia[1] * lm), a = toScreen(S, ASTRO.x + BR_DEBUG.component.astrocyte[0], ASTRO.y + BR_DEBUG.component.astrocyte[1]), r = toScreen(S, RGC.x, RGC.y), h = toScreen(S, HEROXY[0], HEROXY[1]);
  const big = { size: 25, w: 600 };
  tag('activated microglia', m[0] + BR_DEBUG.label.microglia[0] * z, m[1] + 40 * z + BR_DEBUG.label.microglia[1] * z, { ...big, a: o.mic, col: COL.dim });
  tag('astrocyte', a[0] - 190 * k + BR_DEBUG.label.astrocyte[0] * z, a[1] - 84 * k + BR_DEBUG.label.astrocyte[1] * z, { ...big, a: o.ast, col: COL.dim });
  tag('A1 astrocyte', a[0] - 190 * k + BR_DEBUG.label.astrocyte[0] * z, a[1] - 84 * k + BR_DEBUG.label.astrocyte[1] * z, { ...big, a: o.a1, col: mix(A1P.rim, COL.text, .2) });
  tag('retinal ganglion cell', r[0] + 270 * k + BR_DEBUG.label.retinal[0] * z, r[1] + 22 * k + BR_DEBUG.label.retinal[1] * z, { ...big, a: o.rgc, col: mix(RGCP.rim, COL.text, .2) });
  tag('pyramidal neurons', h[0] + 336 * k + BR_DEBUG.label.pyramidal[0] * z, h[1] - 22 * k + BR_DEBUG.label.pyramidal[1] * z, { ...big, a: o.pyr, col: mix(TP.neuron.rim, COL.text, .2) });
  tag('(hippocampus)', h[0] + 336 * k + BR_DEBUG.label.hippocampus[0] * z, h[1] + 10 * k + BR_DEBUG.label.hippocampus[1] * z, { ...big, a: o.pyr, col: THEME.light ? COL.text : [255, 255, 255] });
  tag('saturated lipids', (a[0] + r[0]) / 2 - 10 * k + BR_DEBUG.label.lipid[0] * z, (a[1] + r[1]) / 2 - 46 * k + BR_DEBUG.label.lipid[1] * z, { size: 21, w: 600, a: o.lip || 0, col: PC.lps });
  BR_NAMES.forEach((n, i) => {
    const g = bridgeGlyph(S, i); if (g.a < .05) return; const p = toScreen(S, g.x, g.y), lp = [p[0] + BR_DEBUG.label[BR_TYPES[i]][0] * z, p[1] + BR_DEBUG.label[BR_TYPES[i]][1] * z], col = i === 1 ? COL.tnf : i === 0 ? PC.il1 : PC.c1q, al = g.a * (i === 1 ? o.tnf ?? 1 : 1);
    if (i === 1) txt(n, lp[0], lp[1] + 44, { size: 21, w: 600, col, align: 'center', base: 'middle', a: al, halo: 6 });      // C1q to the left, IL-1α to the right, TNF-α underneath
    else txt(n, lp[0] + (i ? -30 : 28), lp[1], { size: 21, w: 600, col, align: i ? 'right' : 'left', base: 'middle', a: al, halo: 6 });
  });
}
STEPDEF.bridge = {
  apply(S, t) {
    const b = S.br;
    mv(b, 'cyt', 1, A(t, .8, 4.4));                       // IL-1α, TNF-α, C1q leave the microglia and rise to the astrocyte above it
    mv(b, 'astR', 1, A(t, 3.4, 5.6));                     // A1: reactive, coral
    b.lip = seg(t, 5.2, 7.4);                             // it secretes saturated lipids toward the retinal ganglion cell…
    mv(b, 'kill', 1, A(t, 6.6, 10.2));                    // …which then degrades
  },
  over(S, t, gt) { const i = A(t, .3, 1.2); bridgeLabels(S, t, { mic: i, ast: hold(t, .3, 1.2, 4.2, 4.8), a1: A(t, 4.4, 5.2), rgc: i, pyr: 0, lip: hold(t, 5.3, 5.9, 7.2, 7.8) }); },
};
const REVEAL_LIGHT = new URLSearchParams(location.search).get('reveal') === 'light';      // off: the plain un-blur (?reveal=light for the lightness-sweep try)
STEPDEF.bridgeB = {
  apply(S, t) {
    const b = S.br;
    mv(b, 'rgcA', 0, A(t, .4, 1.8));                      // the dead cell and all the old talk's labels go first
    mv(b, 'astR', 0, A(t, .8, 2.8)); mv(b, 'cytA', 0, A(t, .8, 2.4));        // A1 runs backwards; IL-1α and C1q go
    if (REVEAL_LIGHT) {                                   // the pyramidal neurons come in by a lightness sweep: darken to black while still blurred,
      b.revL = t < 1.6 ? -100 * A(t, .6, 1.6) : -100 * (1 - A(t, 1.6, 3.8));   // lose the blur unseen, then rise from the darkest to their set colour
      b.blur = t < 1.6 ? 1 : 0;                           // (under a rim texture the borders shift as they light up)
    } else mv(b, 'blur', 0, A(t, 1.6, 3.0));              // default: the pyramidal neurons come into focus
    const e = A(t, 3.0, 8.4);                             // only then does the camera move
    S.cam.z = BR_Z * Math.exp(Math.log(3.0 / BR_Z) * e); S.cam.x = lerp(BR_CAM[0], COLD_CAM[0], e); S.cam.y = lerp(BR_CAM[1], COLD_CAM[1], e);
    mv(b, 'astDash', 1, A(t, 3.2, 4.8)); mv(b, 'astA', 0, A(t, 5.2, 6.8));   // the astrocyte becomes a dashed outline: removed from the model
    mv(b, 'tnfP', 1, seg(t, 3.0, 8.3));      // (TNF-α fades at the start of the next clip)
    mv(S, 'micro', 0, A(t, 4.6, 7));      // one slow eased glide (the easing is in bridgeGlyph)
    // the staging dissolves back into the plain culture: the left microglia glides home with the camera, the neurons that were
    // hidden or replaced return once out of frame. The right microglia stays where it is until the next scene pulls out.
    b.layM = 1 - e; b.layN = 1 - A(t, 6.8, 8.6); b.rgc = 1 - A(t, 7.2, 8.6);
    // every cell's idle motion eases to a standstill by the end of the clip; the next scene starts it again as it zooms out
    const a = 5.8, z = 8.6; S.lost += t < a ? 0 : t < z ? (t - a) * (t - a) / (2 * (z - a)) : (z - a) / 2 + (t - z);
  },
  over(S, t, gt) {
    const o = 1 - A(t, .3, 1.1);
    bridgeLabels(S, t, { mic: o, ast: 0, a1: o, rgc: o, pyr: hold(t, 2.0, 3.0, 5.4, 6.2), tnf: 1 });
    bridgeQuestion(A(t, 5.4, 6.2));      // still up when the clip ends; it goes as the next clip zooms out
  },
};
function bridgeQuestion(a) {      // the question that closes the bridge (S2); it fades at the start of S3
  if (a <= .004) return;
  glassTag('TNF-α at the hippocampal pyramidal neuron', W / 2, LAY.field.y + LAY.field.h - 30, { size: 28, w: 600, a, parts: [{ text: 'TNF-α', col: COL.tnf }, { text: ' at the hippocampal ' }, { text: 'pyramidal neuron', col: TP.neuron.rim }] });
}

/* 2. The anomaly */
/* 2a: zoom out to the whole coverslip (full width), AβOs go in, bind a subset of neurons. Ends on that caption.
   2b: the caption goes; phospho-PKR rises in every neuron, bound or not; the same cells as immunofluorescence.
   2b runs on 2a's clock (tt = t + ANOM_T): the two were one scene, cut where the binding caption is up. */
const ANOM_T = 8.0;                        // 2b's later beats run on 2a's old clock: tt = t + ANOM_T
const boundXY = (S, i) => toScreen(S, nXY(S, i)[0], nXY(S, i)[1] + (i === 3 ? S.anomNeuron3Y || 0 : 0));
/* The caption, dead centre, with an arrow from its edge to each neuron that carries oligomer. The AβO glyph leads the text (it is
   the legend too). a: caption alpha; d: 0..1 how far the arrows are drawn out from the panel (they are undrawn back the same way). */
/* The centre panel of S3–S4: one glass panel that changes its text (and width) from caption to caption, with the arrows from its
   edge to each neuron that carries oligomer, and a short literature citation under it (same style as the "Fig. 2G" tag in S6).
   The footer citation stays the paper's own; these are the background claims. */
const ANOM_CAPS = {
  bind:  { parts: [{ text: '      ' }, { text: 'AβOs', col: () => PC.abo }, { text: ' bind a subset of neurons' }], glyph: true, cite: 'Lacor et al., 2007' },
  ad:    { parts: [{ text: 'phospho-PKR', col: () => COL.phos }, { text: ' is elevated in AD brains' }], cite: 'Bullido et al., 2008; Hoozemans et al., 2009' },
  prior: { parts: [{ text: 'Prior model: ' }, { text: 'AβOs', col: () => PC.abo }, { text: ' act where they bind' }], cite: 'De Felice et al., 2009; Bomfim et al., 2012' },
  pkr:   { parts: [{ text: 'PKR ↑', col: () => COL.phos }, { text: ' in every neuron regardless of ' }, { text: 'AβO', col: () => PC.abo }, { text: ' binding' }], cite: 'Lourenco et al., 2013 (this study)' },
};
/* the citation inside the panel: the glass grows down by ext px and the citation sits gap px below the old bottom edge (centre
   of the text); size: its font size; rule: a hairline between the claim and the citation. ?cite=1..4 shows the options. */
const CITE_OPTS = {
  1: { ext: 44, gap: 16, size: 26, rule: false, titleDy: 6 },      // tight: the citation tucked right under the claim
  2: { ext: 56, gap: 22, size: 28, rule: false, titleDy: 9 },      // a little air (Felix's pick; titleDy: the claim nudged down)
  3: { ext: 70, gap: 30, size: 30, rule: false, titleDy: 12 },      // roomy, the citation at the old size
  4: { ext: 62, gap: 28, size: 27, rule: true, titleDy: 6 },       // a hairline between claim and citation
};
const CITE_O = CITE_OPTS[new URLSearchParams(location.search).get('cite')] || CITE_OPTS[2];
const capLabel = c => c.parts.map(p => p.text).join(''), capW = c => txtW(capLabel(c), { size: 38, w: 600 }) + 38 * 3.2;
/* from → to (keys of ANOM_CAPS), k: 0..1 how far the panel has changed; a: panel alpha; d: arrows drawn out 0..1; slide: rise-in */
function anomCaption(S, from, to, k, a, d = 0, slide = 1) {
  const A0 = ANOM_CAPS[from], A1 = ANOM_CAPS[to], cx = W / 2, cy = BAND.y + BAND.h / 2 + 16 * (1 - eOut(slide)), size = 38;
  const CO = CITE_O, cw = C => Math.max(capW(C), C.cite ? txtW(C.cite, { size: CO.size, w: 500 }) + 38 * 2.4 : 0);
  const ext = CO.ext * lerp(A0.cite ? 1 : 0, A1.cite ? 1 : 0, ease(k));
  const pw = lerp(cw(A0), cw(A1), ease(k)), ph = size * 2.25, py = cy - size * .12, hw = pw / 2 + 10, hh = ph / 2 + 10, citeH = ext;
  if (d > .004) BOUND.forEach((i, n) => {
    const p = boundXY(S, i), dx = p[0] - cx, dy = p[1] - py, L = Math.hypot(dx, dy) || 1, kk = Math.min(hw / Math.abs(dx || 1e-6), (dy > 0 ? hh + citeH : hh) / Math.abs(dy || 1e-6)), r = 54 * S.cam.z;      // arrows going down start below the citation
    const u = ease(seg(d, n * .12, n * .12 + .64)); if (u <= .004) return;
    drawEdge([cx + dx * kk, py + dy * kk], [p[0] - dx / L * r, p[1] - dy / L * r], { show: u, solid: u }, { w: 1.05 });
  });
  if (a <= .004) return;
  glassPanel(cx - pw / 2, py - ph / 2, pw, ph + ext, Math.min(8, ph * .16), a);      // the glass reaches down round the citation
  const one = (C, ta) => {
    if (ta <= .004) return;
    const ty = cy + (C.cite ? CO.titleDy : 0);      // with a citation under it, the claim sits a little lower in the taller panel
    glassTag(capLabel(C), cx, ty, { a: ta, w: 600, noBox: true, parts: C.parts.map(p => ({ text: p.text, col: p.col && p.col() })) });
    if (C.glyph) { ctx.save(); ctx.translate(cx - txtW(capLabel(C), { size, w: 600 }) / 2 + txtW(C.parts[0].text, { size, w: 600 }) / 2 - 6, ty - 3); gABO(ctx, 50, ta); ctx.restore(); }
    if (C.cite) {      // inside the panel now, in the "Fig. 2G" grey
      const yc = py + ph / 2 + CO.gap;
      if (CO.rule) { ctx.save(); ctx.globalAlpha *= ta * .35; ctx.strokeStyle = rgb(COL.dim); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - pw / 2 + 40, py + ph / 2 - 6); ctx.lineTo(cx + pw / 2 - 40, py + ph / 2 - 6); ctx.stroke(); ctx.restore(); }
      txt(C.cite, cx, yc, { size: CO.size, w: 500, col: COL.dim, align: 'center', base: 'middle', a: ta });
    }
  };
  if (from === to) one(A0, a); else { one(A0, a * (1 - seg(k, 0, .45))); one(A1, a * seg(k, .55, 1)); }
}
STEPDEF.anomaly = {
  apply(S, t) {
    if (t > 0) S.anomNeuron3Y = 80;                       // Felix's layout nudge for the lower-left neuron: it stays there from here on
    { const r = 2.6; S.lost += t < r ? t - t * t / (2 * r) : r / 2; }       // the cells' idle motion picks up again from standstill
    const k = A(t, .1, 4.0); mv(S.cam, 'z', CULT_CAM.z, k); mv(S.cam, 'x', CULT_CAM.x, k); mv(S.cam, 'y', CULT_CAM.y, k);      // out to the whole coverslip,
    mv(S.cam, 'ax', CULT_CAM.ax, k); mv(S, 'spread', 1, k); mv(S.br, 'layM0', 0, k);                                            // spread to fill the full width of the stage; the right microglia goes home
    mv(S, 'ghost', 0, A(t, .5, 2.2)); mv(S.br, 'tnfA', 0, A(t, 0, .9));      // the bridge's TNF-α goes as the view pulls out
    mv(S, 'aboMed', 1, seg(t, 1.2, 5.0)); mv(S, 'aboBind', 1, seg(t, 2.6, 6.6));      // the oligomers go in while the view is still pulling out
    mv(S, 'blurUnbound', 1, A(t, 6.0, 7.4));              // unbound neurons and the microglia drop out of focus as the caption arrives
  },
  over(S, t, gt) {
    const q = 1 - A(t, 0, .8); if (q > .004) { bridgeLabels(S, t, { mic: 0, ast: 0, a1: 0, rgc: 0, pyr: 0, tnf: q }); bridgeQuestion(q); }      // the bridge's question panel and TNF-α label leave with the zoom-out
    const a = A(t, 6.2, 7.6); anomCaption(S, 'bind', 'bind', 0, a, seg(t, 7.2, 8.6), a);
  },
};
/* S3b → S4C. They run 17.9 s where the old S4A + S4B ran 11.3 s; so that S5 onward stays frame-identical, the cells' own clock
   (gt − S.lost) runs slower through these four clips (ANOM_SLOW), S4C's gtDur takes up the difference, and S5 gives the time back. */
// fig: S4C's extra hold on Fig. 1H, with the cells' clock stopped (it is a fixed-cell image), also given back in S5
const ANOM_D = { hold: 2.0, a: 6.4, b: 4.4, c: 5.1, old: 11.3, fig: 4.0 };
const ANOM_RUN = ANOM_D.hold + ANOM_D.a + ANOM_D.b + ANOM_D.c, ANOM_SLOW = (ANOM_RUN - ANOM_D.old) / ANOM_RUN;
const ANOM_EXTRA = ANOM_RUN - ANOM_D.old + ANOM_D.fig;
const slowCells = (S, t) => { S.lost += t * ANOM_SLOW; };
// S3b: hold; the panel changes to the AD-brain finding (arrows stay)
STEPDEF.anomalyHold = { noXfade: true, apply: slowCells, over(S, t) { anomCaption(S, 'bind', 'ad', A(t, .2, 1.4), 1, 1); } };
// S4A: arrows retract, every neuron comes back into focus, the panel becomes the prior model; then only the bound neurons light up
STEPDEF.anomalyB = {
  noXfade: true,
  apply(S, t) { slowCells(S, t); mv(S, 'blurUnbound', 0, A(t, .6, 1.8)); mv(S, 'ppkrB', 1, A(t, 3.0, 5.2)); },
  over(S, t) { anomCaption(S, 'ad', 'prior', A(t, .6, 1.8), 1, 1 - seg(t, .15, 1.0)); },
};
// S4B: the unbound neurons light up too; the panel changes to the result
STEPDEF.anomalyC = {
  noXfade: true,
  apply(S, t) { slowCells(S, t); mv(S, 'ppkr', 1, A(t, .4, 2.8)); S.ppkrB = 1 - A(t, 3.6, 3.8); },      // ppkrB is dropped once every neuron is lit (unseen), so later scenes are as before
  over(S, t) { anomCaption(S, 'prior', 'pkr', A(t, 1.6, 2.8), 1); },
};
// S4C: the same cells as immunofluorescence (the old timings, on their old clock tt); the panel goes as the stains come up
STEPDEF.anomalyD = {
  noXfade: true,
  apply(S, t) {
    slowCells(S, Math.min(t, ANOM_D.c)); S.lost += Math.max(0, t - ANOM_D.c); const tt = t + 14.2;
    const c = S.conf; c.a = A(tt, 14.6, 15.4); c.b = A(tt, 15.0, 16.6); c.r = A(tt, 15.3, 17.0); c.g = A(tt, 16.3, 18.0); c.arrow = 0;
    c.cover = .75 * A(tt, 14.8, 16.9) + .25 * c.g;
    c.box = A(tt, 18.0, 18.9);                            // the glass panel comes up over the immunofluorescence view, then Fig. 1H on it
  },
  over(S, t) { anomCaption(S, 'pkr', 'pkr', 0, 1 - S.conf.a); fig1hCard(A(t, 4.5, 5.4), A(t, 4.9, 5.7)); },
};
// Fig. 1H on the big glass panel (S4C), the conditions above it, the arrow's meaning and the panel number below, all centred
// on the panel. a: the figure; ta: the text
const F1H = { w: 1200, title: 37, foot: 36, gapT: 22, gapB: 24, titleDy: 8 };      // titleDy: the title sits a little lower than its slot (Felix: it read too high)
function fig1hCard(a, ta = a) {
  const im = IMG.fig1hfull; if (a <= .004 || !im || !im.naturalWidth) return;
  const C = F1H, w = C.w, h = im.naturalHeight * w / im.naturalWidth, total = C.title + C.gapT + h + C.gapB + C.foot;
  const x = W / 2 - w / 2, y0 = (FULL ? H / 2 : 512) - total / 2, iy = y0 + C.title + C.gapT, fy = iy + h + C.gapB + C.foot / 2;
  ctx.save(); ctx.globalAlpha *= a; claySuspend(() => ctx.drawImage(im, x, iy, w, h)); ctx.restore();
  if (ta <= .004) return;
  const col = mix(COL.text, COL.dim, .35), f = { w: 500, col, base: 'middle', a: ta };
  txt('Cultured rat hippocampal neurons (18-21 DIV), 500 nM AβOs, 3h', x, y0 + C.title / 2 + C.titleDy, { ...f, size: C.title });
  txt('Arrow = elevated phospho-PKR without bound oligomer', x, fy, { ...f, size: C.foot });
  txt('Fig. 1H', x + w, fy, { ...f, size: C.foot, w: 700, align: 'right' });
}

/* 3. The messenger, measured */
const TNF_CH = () => ({ ylab: 'TNF-α (pg/mL)', ymax: 70, ticks: [0, 20, 40, 60], dec: 0,
  bars: DATA.TNF_MEDIUM.bars.map((b, i) => ({ ...b, col: i ? PC.tnf : mix(PC.tnf, PC.gray, .6), colA: 1 })) });
const TNF_BASE = DATA.TNF_MEDIUM.bars[0].mean / DATA.TNF_MEDIUM.bars[1].mean;
const MS_D = 3.0;      // the chart's clock starts once the big panel has narrowed
// the confocal clip's two panels stay: the channel tag (top) keeps its width and carries this clip's captions; the big panel
// narrows (both sides) to the tag's width and becomes the chart's panel
const MS_TAG = () => { const f = { size: 38, w: 600 }; return { w: txtW('AβOs   pPKR   DAPI', f) + 38 * 3.2, y: FULL ? TAG_BOT : LAY.field.y + LAY.field.h - 34 }; };
const MS_BOX = k => { const bw = lerp(1280, MS_TAG().w, k), bh = 760, cy = FULL ? H / 2 : 512; return { x: W / 2 - bw / 2, y: cy - bh / 2, w: bw, h: bh }; };
STEPDEF.messenger = {
  noXfade: true,      // opens on S4C's last frame exactly (a dissolve would repaint it on this clip's clock)
  apply(S, t0) {
    if (STEPS.some(s => s.fn === 'anomalyD')) S.lost -= ANOM_EXTRA;      // give back what S3b–S4C took (see ANOM_D)
    const c = S.conf; c.own = 1; mv(c, 'a', 0, A(t0, .2, 1.6));      // the cells return from fluorescence under the panels (drawn here, not by the confocal view)
    const t = t0 - MS_D;
    mv(S, 'tnfMed', TNF_BASE, seg(t, 1.0, 2.8)); mv(S, 'micro', 1, A(t, 3.2, 4.4)); mv(S, 'tnfMed', 1, seg(t, 3.8, 8.2));
  },
  over(S, t0, gt) {
    const t = t0 - MS_D, k = A(t0, 1.8, 3.0);
    // the bar is the count: one glyph in the medium per pg/mL
    const veh = seg(t, 1.0, 2.8), rise = seg(t, 3.8, 8.2), b1 = lerp(TNF_BASE, 1, rise), b1A = A(t, 2.9, 3.5);      // the AβO bar fades in at the vehicle level, then rises with the medium
    for (let i = 0; i < 3; i++) { const p = toScreen(S, ...mXY(S, i)), ra = hold(t, 3.2, 4.0, 8.2, 9.0); if (ra > 0) { const pu = (gt * .6 + i * .33) % 1; ctx.save(); ctx.globalAlpha *= ra * (1 - pu); ctx.strokeStyle = rgb(PC.tnf); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p[0], p[1], (22 + pu * 34) * S.cam.z, 0, TAU); ctx.stroke(); ctx.restore(); } }
    const GP = MS_BOX(k), ga = A(t, .1, .8);
    glassPanel(GP.x, GP.y, GP.w, GP.h, 14, 1);      // over the microglia's TNF-α rings, not under them
    if (STEPS.some(s => s.fn === 'anomalyD')) { const fa = 1 - A(t0, 0, .8); fig1hCard(fa); }      // S4C's Fig. 1H leaves before the panel narrows
    panelTitle(GP, [['TNF-α', COL.tnf], [' in the medium']], '', ga, true, 38, 12);
    const fb = GP.y + GP.h - 28, cy0 = GP.y + 104;      // methods footnote: last baseline
    barChart({ x: GP.x + 22, y: cy0, w: GP.w - 44, h: fb - figFootH(2) - 26 - cy0 }, TNF_CH(), { a: ga, grow: i => i ? b1 : veh, barA: i => i ? b1A : 1, sem: A(t, 8.4, 9.0), star: A(t, 9.2, 9.7), val: true, lab: i => i ? A(t, 2.8, 3.3) : 1, labDy: 14, labSize: 25, ylabSize: 25, figTag: 'Fig. 2H', figTagSize: 21 });
    figFoot(['500 nM AβOs, 3h. n=3 independent experiments', 'Mean ± SEM, *p < 0.05, Student’s t-test'], GP.x + 26, fb, GP.w - 52, ga);
    // the channel tag: its panel stays, its text goes as the big panel narrows; then the captions take turns in it
    const G = MS_TAG(), caps = ['vehicle TNF-α baseline', '+AβOs; ↑ TNF-α release', 'source:  microglia?'], fs = Math.min(38, 38 * (G.w - 36) / Math.max(...caps.map(c => txtW(c, { size: 38, w: 600 })))), o = { size: 22, w: 600, boxW: G.w };      // one size for all three captions, the widest fitting the tag
    glassTag('', W / 2, G.y, o);
    glassTag('AβOs   pPKR   DAPI', W / 2, G.y, { ...o, noBox: true, textA: 1 - A(t0, 1.8, 2.6), parts: [{ text: 'AβOs', col: FL.red }, { text: '   ' }, { text: 'pPKR', col: FL.green }, { text: '   ' }, { text: 'DAPI', col: [120, 150, 255] }] });
    glassTag('vehicle TNF-α baseline', W / 2, G.y, { ...o, fs, noBox: true, a: hold(t, 1.1, 1.8, 2.9, 3.4), parts: [{ text: 'vehicle ' }, { text: 'TNF-α', col: COL.tnf }, { text: ' baseline' }] });
    glassTag('+AβOs; ↑ TNF-α release', W / 2, G.y, { ...o, fs, noBox: true, a: A(t, 3.8, 4.5), parts: [{ text: '+' }, { text: 'AβOs', col: COL.abo }, { text: '; ↑ ' }, { text: 'TNF-α', col: COL.tnf }, { text: ' release' }] });
    // (the "source: microglia?" caption was dropped: the tag stays on "+AβOs; ↑ TNF-α release" to the end of the clip)
  },
};

/* 4. The control that earns the architecture
   Two variants of the same step (STEPS[4].fn picks one; V toggles, ?s4=split loads the old one):
     controlDish  experimental: the top-down field irises into one petri dish, the dish divides into two, both tilt, and the
                  experiment runs in each (left AβOs, right infliximab + AβOs);
     control      the original split screen.
   Both end on the same frame (camera on the hero neuron, the model drawn on the cells), so scene 5 follows either. The right
   column is the two redrawn charts stacked in a slim column; the original figure panel is no longer shown here. */
const stack = i => ({ x: LAY.stack.x, y: LAY.stack.y[i], w: LAY.stack.w, h: LAY.stack.h });
const PKR_CH = () => ({ title: 'phospho-PKR', unit: 'a.u.', fig: 'Fig. 2B', ymax: 2.5, ticks: [0, 1, 2], n: 4, nUnit: 'cultures',
  bars: [{ ...DATA.PPKR_INFLIX.bars[0], label: 'veh' }, { ...DATA.PPKR_INFLIX.bars[1], label: 'AβOs', col: PC.phos, colA: 1 }, { ...DATA.PPKR_INFLIX.bars[2], label: 'AβOs', sub: '+ inflix' }] });
const BIND_CH = () => ({ title: 'AβO binding', unit: '% of AβOs alone', fig: 'Fig. 2G', ymax: 125, ticks: [0, 40, 80, 120],
  bars: [{ ...DATA.ABO_BINDING.bars[0], label: 'AβOs', col: PC.abo, colA: 1 }, { ...DATA.ABO_BINDING.bars[1], label: 'AβOs', sub: '+ inflix', col: PC.abo, colA: 1 }] });
// the model drawn on the cells, from time t0: direct edge struck, relay edge solid (shared ending of both variants)
function tissueModel(S, t, t0) {
  const T = S.tis; mv(T, 'a', 1, A(t, t0 - .6, t0 + .2)); mv(S, 'focus', 1, A(t, t0 - .8, t0 + .6));
  mv(T.dir, 'show', 1, A(t, t0, t0 + .9)); mv(T.dir, 'solid', 1, A(t, t0, t0 + .9)); mv(T.dir, 'strike', 1, seg(t, t0 + 1.3, t0 + 1.8));
  mv(T.relay, 'show', 1, A(t, t0 + .6, t0 + 1.6)); mv(T.relay, 'solid', 1, A(t, t0 + 2.1, t0 + 2.9));
  mv(T.tnfN, 'show', 1, A(t, t0 + 1.2, t0 + 2)); mv(T.tnfN, 'solid', 1, A(t, t0 + 2.7, t0 + 3.4));
}
const TIS_CAM = { z: 1.55, x: 625, y: 530, ax: W / 2 };     // the closing view: full width, the hero neuron in the middle of the stage
// One glass panel, centred: first "direct binding doesn't carry the signal", then the same panel changes its text (and width)
// to "a secreted factor does: TNF-α".
function tissueVerdict(t, t0) {
  const a = A(t, t0 + 1.6, t0 + 2.4), k = A(t, t0 + 3.0, t0 + 3.8); if (a <= .004) return;
  const size = 38, f = { size, w: 600 }, s1 = 'direct binding doesn’t carry the signal', s2a = 'a secreted factor does: ', s2b = 'TNF-α';
  const w1 = txtW(s1, f), w2a = txtW(s2a, f), w2 = w2a + txtW(s2b, f), w = lerp(w1, w2, k) + size * 3.2, h = size * 2.25, x = W / 2, y = LAY.field.y + LAY.field.h - 162;
  glassPanel(x - w / 2, y - h / 2 - size * .12, w, h, Math.min(8, h * .16), a);
  txt(s1, x, y, { ...f, align: 'center', base: 'middle', a: a * (1 - seg(k, 0, .45)) });
  const a2 = a * seg(k, .55, 1); txt(s2a, x - w2 / 2, y, { ...f, base: 'middle', a: a2 }); txt(s2b, x - w2 / 2 + w2a, y, { ...f, base: 'middle', col: COL.tnf, a: a2 });
}
function stackCharts(a, g0 = () => 1, g1 = () => 1, o0 = {}, o1 = {}) {
  barChart(stack(0), PKR_CH(), { a: a[0], grow: g0, ...o0 }); barChart(stack(1), BIND_CH(), { a: a[1], grow: g1, ...o1 });
}
/* 4a (dishes): the top-down field eases out into one round dish in the middle of the stage while the neurons go back to
   resting blue; the dish divides there; both tilt. AβOs dish left, infliximab dish far right; the space between them holds two
   frosted panels: upper one = a magnified patch of the infliximab dish ("TNF-α neutralized"), later Fig. 2G; lower one = Fig. 2B. */
const DP = { w: 640, h: 500 }; DP.x = W / 2 - DP.w / 2; DP.y = DISH.yc - DP.h / 2;      // one panel, centred between the dishes at mid-height, its edges over both of them
const PKR_CH2 = () => ({ ...PKR_CH(), title: '', unit: '', fig: '', n: 0, note: '', ylab: 'p-PKR (a.u.)' });
const BIND_CH2 = () => ({ ...BIND_CH(), title: '', unit: '', fig: '', note: '', ylab: 'AβOs binding (%)' });
// what the magnifier sees: a stretch of dendrite with oligomers on it, and TNF-α held by infliximab around it
function neutralizedZoom(R, a, gt) {
  if (a <= .004) return;
  fadeLayer(a, () => neutralizedZoomBody(R, gt));      // drawn at full strength, then faded as ONE picture: no see-through overlaps, no texture pop
}
function neutralizedZoomBody(R, gt) {
  const up = 42;      // everything sits this much higher than it used to: the methods line goes underneath
  ctx.save(); ctx.beginPath(); ctx.roundRect(R.x + 6, R.y + 74, R.w - 12, R.h - 124, 10); ctx.clip();
  const y0 = R.y + R.h * .76 - up, pts = [], ws = [];
  for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(R.x - 30 + u * (R.w + 60), y0 + Math.sin(u * 3.1 + .4) * 22 - u * 26); ws.push(46 - u * 8); }
  tube(ctx, pts, ws, { rim: TP.neuron.rim, body: mix(TP.neuron.body, TP.neuron.rim, UI.cellMix * .5) }, 5);
  for (let k = 0; k < 9; k++) { const u = (k + .5) / 9, i = Math.min(7, Math.floor(u * 8)), f = u * 8 - i, x = lerp(pts[i * 2], pts[i * 2 + 2], f), y = lerp(pts[i * 2 + 1], pts[i * 2 + 3], f), sd = k % 2 ? -1 : 1; ctx.beginPath(); ctx.arc(x, y + sd * (lerp(ws[i], ws[i + 1], f) / 2 + 9), 8.5, 0, TAU); ctx.fillStyle = rgb(PC.abo); ctx.fill(); }
  [[.24, .40, 62, -.25], [.62, .34, 70, .2], [.84, .54, 54, -.1], [.42, .54, 50, .35]].forEach(([fx, fy, sz, rot], k) => {
    glyph(ctx, 'tnfb', R.x + R.w * fx + Math.sin(gt * .5 + k * 2) * 7, R.y + 74 + (R.h - 80) * fy - up + Math.cos(gt * .43 + k) * 6, sz, rot + Math.sin(gt * .3 + k) * .08, 1);
  });
  ctx.restore();
}
// A panel title made of coloured parts ([text, colour?]), shrunk if needed to stay inside the panel; the figure tag goes
// under the panel, outside it, centred.
function panelTitle(R, parts, fig, a, centre = false, max = 31, dy = 0) {
  if (a <= .004) return;
  const full = parts.map(p => p[0]).join(''), avail = R.w - 76, size = Math.min(max, max * avail / txtW(full, { size: max, w: 600 })); let x = centre ? R.x + R.w / 2 - txtW(full, { size, w: 600 }) / 2 : R.x + 38;
  for (const [s, col] of parts) { txt(s, x, R.y + 58 + dy, { size, w: 600, col: col || COL.text, a }); x += txtW(s, { size, w: 600 }); }
  if (fig) txt(fig, R.x + R.w / 2, R.y + R.h + 46, { size: 30, w: 500, col: COL.dim, align: 'center', a });
}
const panelChart = R => ({ x: R.x + 30, y: R.y + 84, w: R.w - 60, h: R.h - 84 - 50 });      // the chart sits under the title, the methods line under it
const panelFoot = (R, s, a) => figFoot(s, R.x + 38, R.y + R.h - 24, R.w - 76, a);
function dishStage(S, t, gt, o = 1) {            // everything drawn over the dishes in 4a; o fades the lot out (4b)
  const xL = dishX(S, 0), xR = dishX(S, 1), yb = DISH.yc + tiltWall(DISH.r, 1) / 2 + DISH.r * tiltK(1), la = A(t, 4.4, 5.4) * o;
  // dish names: plain text, no panel; they stay
  txt('AβOs', xL, yb + 96, { size: 38, w: 600, col: PC.abo, align: 'center', a: la });
  { const s1 = 'AβOs', s2 = ' + Infliximab', w1 = txtW(s1, { size: 38, w: 600 }), w2 = txtW(s2, { size: 38, w: 600 }), x0 = xR - (w1 + w2) / 2; txt(s1, x0, yb + 96, { size: 38, w: 600, col: PC.abo, a: la }); txt(s2, x0 + w1, yb + 96, { size: 38, w: 600, a: la }); }
  /* One panel, three things in turn:  1 a magnified patch of the infliximab dish ("TNF-α neutralized"), while the antibody goes in
                                       2 Fig. 2B   3 Fig. 2G.   Titles say the takeaway; colours follow the theme. */
  const P0 = { x: DP.x, y: DP.y, w: DP.w, h: DP.h }, pa = A(t, 5.8, 6.8) * o;
  const za = hold(t, 6.4, 7.8, 9.6, 10.3) * o, ba = hold(t, 10.5, 11.3, 14.8, 15.5) * o, ga = A(t, 15.7, 16.5) * o;      // the magnified view leaves early: the dish goes on behind the charts
  // the sampled patch: a square lying on the dish floor (so foreshortened like the floor), and the two callout lines from the panel
  if (za > .004) claySuspend(() => {
    const ky = tiltK(1), sw = 76, sh = sw * ky * .9, sx = xR - 46, sy = DISH.yc - 18, ins = 9;
    ctx.save(); ctx.globalAlpha *= za; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgb(COL.ink, .92); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(P0.x + P0.w, P0.y + 16); ctx.lineTo(sx + ins, sy); ctx.moveTo(P0.x + P0.w, P0.y + P0.h - 16); ctx.lineTo(sx, sy + sh); ctx.stroke();
    // seen in the dish's perspective: the far (upper) edge is shorter than the near one
    ctx.beginPath(); ctx.moveTo(sx + ins, sy); ctx.lineTo(sx + sw - ins, sy); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx, sy + sh); ctx.closePath();
    ctx.fillStyle = rgb(COL.ink, .12); ctx.fill(); ctx.strokeStyle = rgb(COL.ink, 1); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  });
  dataGlass(P0.x, P0.y, P0.w, P0.h, pa, 12, false);
  panelTitle(P0, [['TNF-α', COL.tnf], [' neutralized']], '', za);
  neutralizedZoom(P0, za, gt);
  panelFoot(P0, '500 nM AβOs ± infliximab (1 µg/mL, added 30m prior)', za);
  panelTitle(P0, [['Blocking '], ['TNF-α', COL.tnf], [' prevents '], ['PKR', COL.phos], [' activation']], 'Fig. 2B', ba);
  barChart(panelChart(P0), PKR_CH2(), { a: ba, grow: i => A(t, 11.2 + i * .5, 12.4 + i * .5), sem: A(t, 13.0, 13.6), star: A(t, 13.4, 13.9), barA: i => i ? 1 : lerp(1, .38, A(t, 13.7, 14.5)) });
  panelFoot(P0, '3h, n=4 independent cultures. Mean ± SEM, ANOVA + Bonferroni', ba);
  panelTitle(P0, [['Blocking '], ['TNF-α', COL.tnf], [' doesn’t stop '], ['AβO', COL.abo], [' binding']], 'Fig. 2G', ga);
  barChart(panelChart(P0), BIND_CH2(), { a: ga, grow: i => A(t, 16.4 + i * .5, 17.6 + i * .5), sem: A(t, 18.0, 18.6) });
  panelFoot(P0, 'AβO binding (NU4 immunolabeling) Mean ± SEM, n.s', ga);
}
STEPDEF.controlDish = {
  noXfade: true,      // no dissolve from the last frame: the zoom out starts at once, and the TNF-α panels fade on top of it
  apply(S, t) {
    const D = S.dish; D.on = t > 0 ? 1 : 0; D.home = DISH.mid; D.lab = 0;
    D.iris = A(t, 0, 2.7); D.sep = A(t, 2.3, 3.9); D.tilt = A(t, 3.6, 5.2);       // out fast, and straight into the split: no hold on the single dish
    mvs(S, { aboMed: 0, aboBind: 0, ppkr: 0, micro: 0, tnfMed: TNF_BASE }, A(t, 0, 2.3));     // a fresh culture: back to vehicle as the view pulls out
    D.inf = seg(t, 5.6, 7.4);                               // infliximab first, right dish only
    mv(S, 'aboMed', 1, seg(t, 7.8, 10.2)); mv(S, 'aboBind', 1, seg(t, 8.6, 11.6)); mv(S, 'micro', 1, A(t, 9, 10.2)); mv(S, 'tnfMed', 1, seg(t, 9.6, 12.6)); mv(S, 'ppkr', 1, A(t, 11.2, 13.4));
  },
  over(S, t, gt) {
    dishStage(S, t, gt);
    const pa = 1 - A(t, 0, 1.4); if (pa > .004) { ctx.save(); ctx.globalAlpha *= pa; STEPDEF.messenger.over(S, STEPS.find(s => s.fn === 'messenger').dur, gt); ctx.restore(); }      // the previous clip's panels fade as the view pulls out
  },
};
/* S6 is cut into three clips, one panel each. Experiment clock = controlDish's; panel clock tp = dishStage's (controlDish's times).
   6A  zoom out, divide, tilt, infliximab, AβOs going in, the magnified "TNF-α neutralized" panel; ends soon after the panel is up
   6B  the dish experiment carries on to completion (AβOs, TNF-α, pPKR) while the panel changes to Fig. 2B          6C  the panel changes to Fig. 2G
   The three need not add up to the single clip's 19.2 s. So that S7 onward stays frame-identical, the cells' own clock (gt − S.lost)
   runs a little slower through 6B/6C (DISH_EXTRA is taken up there) and S7 gives it back; 6C's gtDur is shortened to match. */
const DISH_T = { a: 8.6, b: 5.2, c: 4.6, orig: 19.2, bP: 9.4, cP: 14.6 };      // 6A ends ~0.8 s after the close-up is in; the dish experiment carries on into 6B      // clip lengths; bP / cP: panel clock at the start of 6B / 6C
const DISH_EXTRA = DISH_T.a + DISH_T.b + DISH_T.c - DISH_T.orig, DISH_SLOW = DISH_EXTRA / (DISH_T.b + DISH_T.c);
STEPDEF.controlDishA = {
  noXfade: true,
  apply(S, t) { STEPDEF.controlDish.apply(S, t); },
  over(S, t, gt) {
    dishStage(S, Math.min(t, 9.0), gt);       // panel clock held once the magnified view is fully up
    const pa = 1 - A(t, 0, 1.4); if (pa > .004) { ctx.save(); ctx.globalAlpha *= pa; STEPDEF.messenger.over(S, STEPS.find(s => s.fn === 'messenger').dur, gt); ctx.restore(); }
  },
};
// the experiment fields on controlDish's own clock (8.6 s into 6A, on into 6B), recomputed from 6A's start state so the curves run on unbroken
const DISH_EXP = (S, te) => {
  const S0 = structuredClone(endState(STEPS.findIndex(x => x.fn === 'controlDishA') - 1)); STEPDEF.controlDish.apply(S0, te);
  for (const k of ['aboMed', 'aboBind', 'ppkr', 'micro', 'tnfMed']) S[k] = S0[k]; S.dish.inf = S0.dish.inf;
};
STEPDEF.controlDishB = { noXfade: true, apply(S, t) { DISH_EXP(S, DISH_T.a + t); S.lost += t * DISH_SLOW; }, over(S, t, gt) { dishStage(S, DISH_T.bP + t, gt); } };
STEPDEF.controlDishC = { noXfade: true, apply(S, t) { S.lost += t * DISH_SLOW; }, over(S, t, gt) { dishStage(S, DISH_T.cP + t, gt); } };
/* 4b (dishes): panels and names go while the dishes level out; they slide back together in the middle, and the camera eases
   back down into that culture, full width, to draw the verdict on the cells. */
STEPDEF.controlBack = {
  noXfade: true,      // opens on 6C's last frame exactly (a dissolve would repaint it on this clip's clock)
  apply(S, t) {
    const D = S.dish, c = S.cam;
    if (STEPS.some(s => s.fn === 'controlDishC')) S.lost -= DISH_EXTRA;      // give back what 6B / 6C took (see DISH_T)
    if (t > 0) { D.home = DISH.mid; Object.assign(c, TIS_CAM); S.swarmA = .22; }     // unseen while the dishes are up: the view the iris will open onto
    D.lab = 0; D.tilt = 1 - A(t, .1, 1.4); D.sep = 1 - A(t, .7, 2.2); D.rA = 1 - A(t, 2.0, 2.3);      // level, slide together and push in as one overlapping move
    D.iris = 1 - A(t, 1.9, 4.6); D.on = t < 4.62 ? 1 : 0;
    tissueModel(S, t, 4.8);
    mv(S, 'legendH', 1, A(t, 5.0, 6.0));                  // the arrow legend arrives once the view is back in the culture
  },
  over(S, t, gt) { dishStage(S, 99, gt, 1 - A(t, .1, .8)); tissueVerdict(t, 4.8); },
};
/* 4a / 4b, original split-screen variant */
STEPDEF.control = {
  apply(S, t) {
    // a fresh pair of wells: reset, then run both sides again, infliximab present first on the right
    const r = A(t, .6, 2.0); mvs(S, { aboMed: 0, aboBind: 0, ppkr: 0, micro: 0, tnfMed: TNF_BASE }, r);
    mv(S, 'split', 1, A(t, 1.0, 2.4)); mv(S, 'inflix', 1, seg(t, 2.6, 4.6));
    mv(S, 'aboMed', 1, seg(t, 4.8, 7.4)); mv(S, 'aboBind', 1, seg(t, 5.6, 8.6)); mv(S, 'micro', 1, A(t, 6, 7.2)); mv(S, 'tnfMed', 1, seg(t, 6.6, 9.6)); mv(S, 'ppkr', 1, A(t, 8.6, 10.8));
  },
  over(S, t, gt) {
    stackCharts([A(t, 9.6, 10.4), A(t, 12.8, 13.6)], i => A(t, 10.2 + i * .5, 11.4 + i * .5), i => A(t, 13.6 + i * .5, 14.8 + i * .5),
      { sem: A(t, 12.6, 13.2), dots: seg(t, 13, 13.6), star: A(t, 13.2, 13.7) }, { sem: A(t, 15.4, 16) });
    splitVerdicts(S, [A(t, 10.6, 11.4), A(t, 13.8, 14.6)]);
  },
};
function splitVerdicts(S, a) {
  const F = LAY.field, sx = toScreen(S, spX(SPLIT_X, S.spread || 0), 0)[0];
  glassTag('signal: blocked', (sx + 1450) / 2, F.y + F.h - 64, { a: a[0], size: 23, w: 600, col: COL.text });
  glassTag('binding: unchanged', (sx + 1450) / 2, F.y + F.h - 34, { a: a[1], size: 23, w: 600, col: COL.abo });
  glassTag('phospho-PKR up', (F.x + sx) / 2 + 150, F.y + F.h - 34, { a: a[0], size: 23, w: 600, col: COL.phos });
}
STEPDEF.controlBackSplit = {
  apply(S, t) {
    const c = A(t, .4, 2.0); mv(S, 'split', 0, c); mv(S, 'inflix', 0, c);
    const z = A(t, 1.6, 4.4), C = S.cam; for (const k in TIS_CAM) mv(C, k, TIS_CAM[k], z); mv(S, 'swarmA', .22, z);
    tissueModel(S, t, 4.2);
    mv(S, 'legendH', 1, A(t, 4.4, 5.4));
  },
  over(S, t, gt) { const o = 1 - A(t, .3, 1.1); splitVerdicts(S, [o, o]); stackCharts([o, o]); tissueVerdict(t, 4.2); },
};

/* 5. Into the neuron, and which kinase
   One continuous exponential zoom, no morph. The camera locks onto the upper edge of the dendrite on the right of the hero's
   soma (cam.track), levels it (cam.rotK, a few degrees) and carries it up to the board's membrane line (cam.ay). It keeps
   going until the frame is black above that line and the neuron's one colour below it; only then does the board take over
   (a plain cross-fade between two identical pictures) and the membrane and molecules are drawn in. */
const ZOOM_END = 5000;
/* TIMERS for scene 8, in seconds. ZOOM_STOP: when the push-in stops (the curve is the same as before, just cut here; by ~2.4 s
   the frame is already only edge and colour). The board/membrane/molecule reveal follows ZOOM_STOP directly. */
const ZOOM_STOP = 2.8;
const TNF_HI = 46;            // scene 8: how far above its resting place (on the receptor) TNF-α starts, px; it descends and binds
const KSLOT = [['PERK', -380], ['GCN2', -260], ['HRI', -140]];      // the other three eIF2α kinases, all left of PKR (x offsets from PKR, board units)
const EIFK_CH = () => ({ ylab: 'eIF2α-P (a.u.)', fig: '', ymax: 3.2, ticks: [0, 1, 2, 3], note: '', matrix: [{ name: 'AβOs', vals: ['−', '+', '+'] }, { name: 'PKRi', vals: ['−', '−', '+'] }],
  bars: [{ ...DATA.EIF2A_PKRI.bars[0], label: 'vehicle' }, { ...DATA.EIF2A_PKRI.bars[1], label: 'AβOs', col: PC.phos, colA: 1 }, { ...DATA.EIF2A_PKRI.bars[2], label: 'AβOs', sub: '+ PKR inhibitor' }] });
// Data panel furniture for the board scenes: a big left-aligned title (wrapped), the chart area under it, and a takeaway at the bottom.
const dpTitle = (s, a) => { if (a > .004) wrapTxt(s, PANEL.x + 38, PANEL.y + 58, PANEL.w - 70, { size: 31, w: 600, a }, 38); };
const dpChart = (top = 272, bottom = 132) => ({ x: PANEL.x + 26, y: PANEL.y + top - 170, w: PANEL.w - 52, h: PANEL.h - (top - 170) - bottom });
const dpTakeaway = (s, a, lines = 2) => { if (a > .004) wrapTxt(s, PANEL.x + 38, PANEL.y + PANEL.h - 22 - (lines - 1) * 33, PANEL.w - 70, { size: 25, w: 600, a }, 33); };
/* 5a. In vivo models
   Two darkened glass squares (panelSq: left edge on the legend's left edge, right edge on its right edge): Cynomolgus monkey on
   the left, mouse models on the right. Felix's pictures and wording; the facts are Lourenco 2013 (mice: Figs. 3, 5 and APP/PS1;
   monkeys: Figs. 1L-O, 6F-H). */
// metal for the two keys: [highlight, body, shadow]
const KEY_METAL = { silver: [[248, 250, 253], [170, 178, 190], [96, 104, 116]], gold: [[255, 238, 160], [222, 166, 40], [128, 86, 10]] };
// Lucide's key-round (24-unit outline), stroked in metal; x, y: the top-left of its s-px box
const KEY_PATH = typeof Path2D !== 'undefined' ? new Path2D('M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z') : null;
function keyIcon(x, y, s, metal) {
  if (!KEY_PATH) return;
  const [hi, md, lo] = metal, k = s / 24;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgb(lo); ctx.lineWidth = 2 + 2.4 / k; ctx.stroke(KEY_PATH);      // dark rim
  const g = ctx.createLinearGradient(2, 22, 22, 2);                                   // brushed-metal banding along the key
  [[0, md], [.25, hi], [.45, md], [.62, hi], [.82, lo], [1, md]].forEach(([u, c]) => g.addColorStop(u, rgb(c)));
  ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.stroke(KEY_PATH);
  ctx.beginPath(); ctx.arc(16.5, 7.5, 1.1, 0, TAU); ctx.fillStyle = rgb(lo); ctx.fill();      // the bow's hole
  ctx.restore();
}
function wrapLines(s, maxW, o) { let n = 0, line = ''; for (const w of s.split(' ')) { const t2 = line ? line + ' ' + w : w; if (txtW(t2, o) > maxW && line) { n++; line = w; } else line = t2; } return n + (line ? 1 : 0); }
function wrapTxt(s, x, y, maxW, o, lh) {            // left-aligned, word-wrapped; returns the y after the last line
  let line = ''; for (const w of s.split(' ')) { const t2 = line ? line + ' ' + w : w; if (txtW(t2, o) > maxW && line) { txt(line, x, y, o); y += lh; line = w; } else line = t2; }
  if (line) { txt(line, x, y, o); y += lh; } return y;
}
const VIVO_CARD = { title: 44, sub: 30, base: 530, verdict: 34, vw: 500, lh: 44 };      // card furniture: font sizes, picture baseline (from the panel top)
function vivoPanels(S) {
  const V = S.vivo, leftA = (V.left || 0) * (V.lc ?? 1), rightA = V.c || 0;
  if (leftA <= .004 && rightA <= .004) return;
  const mo = IMG.vivomouse, mk = IMG.vivomonkey; if (!mo || !mk || !mo.naturalWidth || !mk.naturalWidth) return;
  const C = VIVO_CARD, card = (R, title, sub, im, h, metal, verdict, imageDy = 0) => {      // verdict: its lines, as they should break
    const y0 = R.y + (R.h - PANEL.h) / 2;      // the card's contents stay centred in the (taller than wide) panel
    const cx = R.x + R.w / 2, L = R.x + 60, base = y0 + C.base;
    txt(title, cx, y0 + 62, { size: C.title, w: 600, align: 'center' }); if (sub) txt(sub, cx, y0 + 108, { size: C.sub, w: 500, it: true, col: COL.dim, align: 'center' });
    const w = im.naturalWidth * h / im.naturalHeight; claySuspend(() => ctx.drawImage(im, cx - w / 2, base - h + imageDy, w, h));
    const ks = 80, tx = L + 140, vo = { size: C.verdict, w: C.vw }, ty = base + 84;
    keyIcon(L + 12, ty - 12 + (verdict.length - 1) * C.lh / 2 - ks / 2, ks, metal); verdict.forEach((s, i) => txt(s, tx, ty + i * C.lh, vo));      // the key spans both lines
  };
  ctx.save();
  ctx.globalAlpha *= leftA;
  card(panelSq().L, 'Cynomolgus monkey', '(not to scale)', mk, 380, KEY_METAL.silver, ['Primate brain; only', 'confirms the markers rise.'], -6);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= rightA;
  card(panelRect(S), 'Mouse models', '', mo, 400, KEY_METAL.gold, ['Knockouts, drugs, behaviour.', 'Every causal test is here.']);
  ctx.restore();
}
STEPDEF.vivo = {          // the push-in: from the culture into the hero neuron's membrane, then the receptor and the upstream pathway
  apply(S, t) {
    const c = S.cam, Z = ZOOM_STOP;
    c.z = Math.exp(lerp(Math.log(c.z), Math.log(ZOOM_END), ease(seg(Math.min(t, Z), .3, 4.0))));
    c.track = A(t, .3, 1.7); c.rotK = A(t, .4, 2.3); c.ay = lerp(FC.y, MEMB_OUT, A(t, .4, 2.4));
    mv(S.tis, 'lab', 0, A(t, .2, .8)); mv(S.tis, 'a', 0, A(t, .5, 1.5)); mv(S, 'swarmA', 0, A(t, .4, 1.5));
    S.panelK = 0;                                          // no data panel in this clip (it arrives with the chart in the next one)
    // hand-over, cell → board, and rim → lipids. No molecules yet.
    S.nodesA = t > 0 ? 0 : S.nodesA; S.flat = 1; S.cyt = 1;
    // cell → board in one frame: they are the same colours by now (theme.js board, measured off the textured neuron), and a
    // cross-fade left the two membrane bands half-transparent over each other (the cytoplasm showed through, a two-tone band)
    mv(S, 'boardA', 1, t >= Z - .1 ? 1 : 0); mv(S, 'cultA', 0, A(t, Z + .1, Z + .3)); S.beads = A(t, Z + .1, Z + 1.1);
    // once the membrane has settled the pathway appears: AβOs, TNF-α (raised, clear of the receptor), TNFR1, PKR, AβO → TNF-α
    if (t > Z) { mvs(S.n.abo, { a: 1 }, 1); mvs(S.n.tnf, { a: 1, up: 1 }, 1); mvs(S.n.tnfr, { a: 1 }, 1); mvs(S.n.pkr, { a: 1 }, 1); S.micTag = 1; mvs(S.e.abo_tnf, { show: 1, solid: 1 }, 1); mvs(S.e.tnf_tnfr, { show: 1, solid: 1 }, 1); }
    S.nodesA = A(t, Z + .5, Z + 1.6);
    // TNF-α descends (the AβO → TNF-α arrow is anchored to it and follows), contacts the receptor, the chains close on it
    S.n.tnf.dy = -TNF_HI * (1 - A(t, 5.0, 6.1));
    S.n.tnfr.bound = A(t, 5.8, 6.6); S.n.tnfr.lit = A(t, 6.2, 7.0);
    // dashed arrow from the receptor's tails down to PKR
    S.e.tnfr_pkr = { show: A(t, 7.4, 8.3), solid: 0, strike: 0 };
    // AβO → PKR draws, then the ruled-out slashes stamp on
    { const d = A(t, 8.8, 9.7); S.e.abo_dir = { show: d, solid: d, strike: seg(t, 10.0, 10.5) }; }
  },
  over(S, t, gt) { },
};
/* 5b. Which kinase
   eIF2α arrives (resting), the other three eIF2α kinases appear left of PKR under one bracket, the data panel (a square, right
   edge on the legend's right edge) brings Fig. 1K, the other kinases step back, PKR → PKR-P, the arrow to eIF2α draws solid,
   eIF2α → eIF2α-P. */
const KIN_T = { eif: [.3, 1.3], kin: [1.6, 2.6], panel: [3.2, 4.0], chart: [3.6, 4.4], kinOut: [8.6, 9.6], pkr: [10.2, 11.4], arrow: [11.8, 12.8], eifP: [13.2, 14.4] };
STEPDEF.kinase = {
  apply(S, t) {
    const V = S.vivo, T = KIN_T;
    V.c = 0; V.left = 0; V.a = 0; V.k = 0;               // the right panel is the square one in scenes 9-10 (the fork clip glides it home)
    S.nodesA = 1; S.legend = 0;
    mv(S.n.eif, 'a', 1, A(t, ...T.eif));
    S.panelK = A(t, ...T.panel);
    mv(S.n.pkr, 'lit', 1, A(t, ...T.pkr)); mv(S.e.tnfr_pkr, 'solid', 1, A(t, ...(T.solid || [T.pkr[0] + .6, T.pkr[1] + .6])));
    { const d = A(t, ...T.arrow); mv(S.e.pkr_eif, 'show', 1, d); mv(S.e.pkr_eif, 'solid', 1, d); }
    mv(S.n.eif, 'lit', 1, A(t, ...T.eifP));
  },
  over(S, t, gt) {
    const T = KIN_T, P = nodeXY(S, 'pkr'), sa = hold(t, T.kin[0], T.kin[1], T.kinOut[0] + .4, T.kinOut[1]) * S.boardA, cyt = cytoColor(S), dim = mix(COL.dim, COL.text, .8), off = A(t, T.kinOut[0], T.kinOut[0] + .8);
    if (sa > 0) {
      const x0 = P[0] - 410 * BK, x1 = P[0] + 50 * BK, ym = P[1] + 90, mid = (x0 + x1) / 2;
      txt('four kinases can phosphorylate eIF2α', mid - 34, P[1] + 188, { size: 30, w: 600, align: 'center', a: sa, halo: 6, haloCol: cyt });
      for (const [nm, dx] of KSLOT) {
        const x = P[0] + dx * BK;
        ctx.save(); ctx.globalAlpha *= sa; ctx.translate(x, P[1]); ctx.scale(1.05 * BK, 1.05 * BK); mKIN({ off }); ctx.restore();
        txt(nm, x, P[1] + 68, { size: 24, w: 600, align: 'center', col: mix(COL.text, dim, off), a: sa, halo: 6, haloCol: cyt });
      }
      ctx.save(); ctx.globalAlpha *= sa; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, ym); ctx.quadraticCurveTo(x0, ym + 22, x0 + 34, ym + 22); ctx.quadraticCurveTo(mid - 34, ym + 22, mid - 12, ym + 34);
      ctx.lineTo(mid, ym + 48); ctx.lineTo(mid + 12, ym + 34); ctx.quadraticCurveTo(mid + 34, ym + 22, x1 - 34, ym + 22); ctx.quadraticCurveTo(x1, ym + 22, x1, ym); ctx.stroke(); ctx.restore();
    }
    kinaseChart(S, t);
  },
};
/* S9B: what eIF2α does (the schematic on the square panel)
   Plays once over the clip (no loop). Top, normal: eIF2 brings the initiator tRNA (cloverleaf, anticodon on the bottom lobe) to
   the start codon on the small subunit, lets go and goes back to the recharger; the large subunit joins (no protein bead chain any
   more: cut to save time). Bottom, eIF2α-P (appears later, stays still): phosphorylated eIF2 stuck on the recharger, an empty small
   subunit, nothing starts. Flat illustration style for the ribosome / tRNA / mRNA (fortune-cookie ribosome, as Felix's
   reference); the α subunit is labelled. EIFS: the beats, on the S9B clock. */
const EIFS = { dur: 8.8, panel: [.2, 1.0], in: [.6, 1.4], go: [1.4, 2.9], let: [3.0, 3.4], back: [3.3, 4.7], join: [3.5, 4.3], out: [5.0, 6.0], swapIn: [6.2, 7.2] };      // out / swapIn: the normal scene and its title fade out, then the eIF2α-P scene and its title fade in (one after the other)
const COOKIE = { lg: [[240, 203, 128], [196, 138, 60]], sm: [[247, 218, 158], [214, 165, 88]], line: [122, 82, 32] };
const BASE_COL = { A: [255, 112, 64], U: [255, 214, 110], G: [206, 92, 206], C: [156, 180, 52] };
const MRNA_SEQ = 'GCCACCAUGGCUAAGUUCGGAUCC', MRNA_AUG = 6;      // the start codon's first base
const TRNA_COL = [236, 226, 200], AA_COLS = [[94, 196, 178], [170, 150, 230], [236, 226, 200], [230, 150, 120], [140, 190, 110]];
const flat = fn => claySuspend(fn);
function cookieFill(path, c0, c1, y0, y1, hl) {      // glossy flat fill: top-to-bottom gradient, dark outline, soft highlight
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(c0)); g.addColorStop(1, rgb(c1));
  ctx.fillStyle = g; path(); ctx.fill(); ctx.strokeStyle = rgb(COOKIE.line, .85); ctx.lineWidth = 2.2; ctx.stroke();
  if (hl) { ctx.save(); path(); ctx.clip(); ctx.beginPath(); ctx.ellipse(hl[0], hl[1], hl[2], hl[3], -.15, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fill(); ctx.restore(); }
}
function ribSmall(x, y, k = 1, grey = 0) {      // the small subunit, under the mRNA at y
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const P = () => { ctx.beginPath(); ctx.moveTo(-118, 2); ctx.bezierCurveTo(-118, -10, -60, -6, 0, -4); ctx.bezierCurveTo(60, -6, 118, -12, 118, 4); ctx.bezierCurveTo(120, 40, 70, 56, 0, 56); ctx.bezierCurveTo(-70, 56, -120, 40, -118, 2); ctx.closePath(); };
  const [a, b] = COOKIE.sm; cookieFill(P, mix(a, [150, 150, 150], grey), mix(b, [110, 110, 110], grey), -6, 56, [-50, 14, 34, 10]);
  ctx.restore();
}
function ribLarge(x, y, k = 1) {      // the large subunit, sitting on the mRNA at y (its base), a lobe out to the left
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const back = () => { ctx.beginPath(); ctx.ellipse(-104, -18, 40, 26, -.2, 0, TAU); };
  cookieFill(back, mix(COOKIE.lg[1], [0, 0, 0], .15), mix(COOKIE.lg[1], [0, 0, 0], .3), -44, 8);
  const P = () => { ctx.beginPath(); ctx.moveTo(-122, -14); ctx.bezierCurveTo(-136, -56, -104, -76, -76, -82); ctx.bezierCurveTo(-64, -134, 4, -152, 56, -136); ctx.bezierCurveTo(118, -118, 132, -60, 126, -12); ctx.bezierCurveTo(124, 6, 60, 2, 0, 0); ctx.bezierCurveTo(-60, 2, -112, 6, -122, -14); ctx.closePath(); };
  const [a, b] = COOKIE.lg; cookieFill(P, a, b, -150, 0, [-6, -118, 50, 14]);
  ctx.restore();
}
function mRNA(x0, x1, y, sp = 15) {      // the strand and its bases (sticks up); returns the x of base i
  const bx = i => x0 + 16 + i * sp;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < MRNA_SEQ.length; i++) { const x = bx(i); if (x > x1 - 10) break; ctx.strokeStyle = rgb(BASE_COL[MRNA_SEQ[i]]); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 24); ctx.stroke(); }
  ctx.strokeStyle = rgb([118, 30, 38]); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, y + 2); ctx.bezierCurveTo(x0 + (x1 - x0) * .3, y - 4, x0 + (x1 - x0) * .7, y + 6, x1, y); ctx.stroke();
  ctx.restore(); return bx;
}
// initiator tRNA, cloverleaf, after Felix's reference: acceptor stem up (Met on its 3' end), the D arm and loop left, the T arm and
// loop right, the small variable loop lower right, the anticodon arm down with a big loop and its three bases (UAC, pairing
// with AUG) pointing down. One cream strand; drawn in the reference's own units (≈ 800 px box) and scaled. (x, y): the tips of the
// anticodon bases.
const TRNA_K = .158;
function tRNAPath() {
  ctx.beginPath(); ctx.moveTo(440, 44); ctx.lineTo(440, 368); ctx.quadraticCurveTo(440, 400, 472, 400); ctx.lineTo(620, 400);
  ctx.arc(695, 437, 82, -2.68, 2.73, false);
  ctx.lineTo(482, 470); ctx.lineTo(545, 522); ctx.quadraticCurveTo(578, 548, 540, 568); ctx.lineTo(462, 514); ctx.quadraticCurveTo(440, 506, 440, 548);
  ctx.lineTo(440, 705); ctx.arc(400, 785, 88, -1.107, 4.249, false); ctx.lineTo(360, 532); ctx.quadraticCurveTo(360, 510, 330, 510); ctx.lineTo(220, 510);
  ctx.arc(150, 475, 80, .464, 5.82, false); ctx.lineTo(330, 440); ctx.quadraticCurveTo(360, 440, 360, 410); ctx.lineTo(360, 170);
}
function tRNA(x, y, k = 1, met = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k * TRNA_K, k * TRNA_K); ctx.translate(-400, -946); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [['U', -.42], ['A', 0], ['C', .42]].forEach(([b, da]) => { const th = Math.PI / 2 + da * .95, x0 = 400 + Math.cos(th) * 88, y0 = 785 + Math.sin(th) * 88; ctx.strokeStyle = rgb(BASE_COL[b]); ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x0, y0 + 74); ctx.stroke(); });
  tRNAPath(); ctx.strokeStyle = rgb(mix(TRNA_COL, [0, 0, 0], .55)); ctx.lineWidth = 66; ctx.stroke();
  ctx.strokeStyle = rgb(TRNA_COL); ctx.lineWidth = 44; ctx.stroke();
  if (met > .004) { ctx.globalAlpha *= met; ctx.beginPath(); ctx.arc(440, 0, 60, 0, TAU); ctx.fillStyle = rgb(AA_COLS[0]); ctx.fill(); ctx.strokeStyle = rgb(mix(AA_COLS[0], [0, 0, 0], .45)); ctx.lineWidth = 12; ctx.stroke(); }
  ctx.restore();
}
// the new protein: beads extruded along one fixed, smooth path out of the large subunit (the oldest bead leads); n beads so far
const PROT_PATH = (() => { const c = [[0, 0], [26, -24], [64, -38], [104, -30], [130, -4], [132, 32], [110, 58], [78, 64], [56, 46]], out = [];
  for (let i = 0; i < c.length - 1; i++) { const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
    for (let k = 0; k < 12; k++) { const u = k / 12, u2 = u * u, u3 = u2 * u; out.push([0, 1].map(d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3))); } }
  out.push(c[c.length - 1]); const L = [0]; for (let i = 1; i < out.length; i++) L.push(L[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, L, len: L[L.length - 1] }; })();
const protAt = d => { const P = PROT_PATH; d = clamp(d, 0, P.len); let i = 1; while (i < P.L.length - 1 && P.L[i] < d) i++; const u = (d - P.L[i - 1]) / ((P.L[i] - P.L[i - 1]) || 1); return [lerp(P.pts[i - 1][0], P.pts[i][0], u), lerp(P.pts[i - 1][1], P.pts[i][1], u)]; };
function protein(x, y, n) {
  if (n <= .004) return;
  const sp = 15, pts = []; for (let j = 0; j < Math.ceil(n); j++) { const d = (n - j) * sp; if (d < 0) continue; const [px, py] = protAt(d); pts.push([x + px, y + py, j, Math.min(1, n - j)]); }
  ctx.save(); ctx.strokeStyle = rgb([210, 200, 180], .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); for (const [px, py] of pts.slice().reverse()) ctx.lineTo(px, py); ctx.stroke();
  for (const [px, py, j, g] of pts) { const c = AA_COLS[(j * 3 + 1) % AA_COLS.length]; ctx.beginPath(); ctx.arc(px, py, 7.5 * (.5 + .5 * g), 0, TAU); ctx.fillStyle = rgb(c); ctx.fill(); ctx.strokeStyle = rgb(mix(c, [0, 0, 0], .45)); ctx.lineWidth = 1.8; ctx.stroke(); }
  ctx.restore();
}
function gEIF2(x, y, s, a, phos = 0) {      // eIF2 (α, β, γ) as on the board; α labelled on its own subunit; phos: its P
  if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); mEIF({ lit: phos }); ctx.restore();
  txt('α', x - 10 * s, y - 6 * s, { size: 20 * s, w: 700, align: 'center', base: 'middle', a, col: phos > .5 ? [40, 26, 0] : COL.ink });
}
function gRECH(x, y, stuck = 0) {      // the recharging factor (eIF2B, unnamed on screen)
  const P = palMix(NP.er, NP.off, stuck * .55);
  dom(ctx, x - 28, y, 44, 32, -.2, P, 1.6); dom(ctx, x + 26, y + 5, 40, 30, .25, P, 1.6);
}
function eifSchematic(S, R, a, t, gt) {
  if (a <= .004) return;
  fadeLayer(a, () => eifSchematicBody(R, t, gt));      // one picture: no see-through overlaps while it fades
}
function eifSchematicBody(R, t, gt) {
  const T = EIFS, L = (s, x, y, la = 1, o = {}) => { if (la > .004) txt(s, x, y, { size: 22, w: 500, col: mix(COL.dim, COL.text, .75), align: 'center', base: 'middle', a: la, ...o }); };
  const so = ease(seg(t, ...T.out)), sw = ease(seg(t, ...T.swapIn)), tf = { size: 34, w: 600 };
  if (so < 1) txt('eIF2α starts protein synthesis', R.x + 38, R.y + 58, { ...tf, a: 1 - so });
  if (sw > 0) { const o = { ...tf, a: sw }, w1 = txtW('eIF2α-P', o); txt('eIF2α-P', R.x + 38, R.y + 58, { ...o, col: COL.phos }); txt(': no protein synthesis', R.x + 38 + w1, R.y + 58, o); }
  const DX = 44, RK = .88, my = R.y + R.h - 140, rx = R.x + R.w * .52 + DX, hx = R.x + R.w * .15 + DX, hy = my - 30, bx0 = rx - 176, bx1 = R.x + R.w - 150 + DX;      // mRNA, ribosome (RK: its scale), recharger; DX: all of it nudged right
  const scene1 = () => {
    const go = ease(seg(t, ...T.go)), let_ = ease(seg(t, ...T.let)), back = ease(seg(t, ...T.back)), join = ease(seg(t, ...T.join));
    const ax = bx0 + 16 + (MRNA_AUG + 1) * 15, dockY = my - 26, sx = hx + 150, sy = my - 30;
    const tx = lerp(sx, ax, go), ty = lerp(sy, dockY, go) - Math.sin(go * Math.PI) * 30;
    const e0x = tx - 100, e0y = ty - 66, homeX = hx, homeY = hy - 50;
    const ex = t < T.let[0] ? e0x : lerp(lerp(ax - 100, ax - 130, let_), homeX, back), ey = t < T.let[0] ? e0y : lerp(lerp(dockY - 66, dockY - 96, let_), homeY, back) - Math.sin(back * Math.PI) * 26;
    flat(() => { if (join > .004) fadeLayer(join, () => ribLarge(rx, my - 8 - 50 * (1 - join), RK)); ribSmall(rx, my + 6, RK); mRNA(bx0, bx1, my); });
    gRECH(hx, hy + 30); L('recharger', hx, hy + 96);
    flat(() => tRNA(tx, ty, 1));
    gEIF2(ex, ey, 1.15, 1);
    const lab0 = 1 - seg(t, T.go[0], T.go[0] + .4);
    L('eIF2α', ex, ey - 46, 1, { w: 600, col: COL.text }); L('tRNA', sx + 66, sy - 110, lab0);      // eIF2α named above the complex, all the way
    L('mRNA', bx1 - 18, my + 34); L('ribosome', rx, my + 76);
  };
  const scene2 = () => {      // the same place, frozen: eIF2α-P stuck on the recharger, an empty small subunit
    gRECH(hx, hy + 30, 1); gEIF2(hx + 4, hy - 20, 1.15, 1, 1); L('recharger trapped', hx + 8, hy + 96);
    L('eIF2α-P', hx + 4, hy - 86, 1, { w: 600, col: COL.phos });
    flat(() => { ribSmall(rx, my + 6, RK, .35); mRNA(bx0, bx1, my); }); L('mRNA', bx1 - 18, my + 34);
    L('no tRNA, nothing starts', rx, my + 76);
  };
  if (so < 1) fadeLayer(1 - so, scene1);
  if (sw > 0) fadeLayer(sw, scene2);
}
// S9 in two clips. S9A: kinase's opening (eIF2α arrives, its first KIN_SPLIT s), then the schematic on the short panel (EIFS clock,
// EIFS_OFF s in). S9B: the schematic clears, the kinases come in, a hold while the panel grows back up to full height (bottom
// edge fixed), then the rest of kinase (Fig. 1K) on its own clock.
// ?kin4=1: the longer cut with the four-kinase bracket and its hold (cut from the talk for time, kept for the website)
const KIN4 = new URLSearchParams(location.search).get('kin4') === '1';
const KIN_SPLIT = 1.6, KIN_DUR = 16, EIFS_OFF = 1.2, KIN_HOLD = 1.2, KIN_HOLD_AT = 1.2, PANEL_GROW = KIN4 ? [1.3, 2.9] : [.4, 2.0];
STEPDEF.eifSchem = {
  apply(S, t) { STEPDEF.kinase.apply(S, Math.min(t, KIN_SPLIT)); S.panelK = A(t - EIFS_OFF, ...EIFS.panel); S.panelShort = 1; },
  over(S, t, gt) { STEPDEF.kinase.over(S, Math.min(t, KIN_SPLIT), gt); eifSchematic(S, panelRect(S), A(t - EIFS_OFF, ...EIFS.in), t - EIFS_OFF, gt); },
};
// S9B → kinase's clock (the hold was for the kinase bracket, now gone)
const kinTT = t => KIN_SPLIT + (!KIN4 || t < KIN_HOLD_AT ? t : t < KIN_HOLD_AT + KIN_HOLD ? KIN_HOLD_AT : t - KIN_HOLD);
// S9B's own beats (kinase clock = KIN_SPLIT + clip time, no hold): no four-kinase bracket any more (Felix: save time). The schematic
// clears as the panel grows back to full height, Fig. 1K follows at once, then PKR goes solid and is phosphorylated, PKR-P → eIF2α,
// eIF2α-P. kin / kinOut are pushed past the end so the bracket never draws.
const KIN_T_B = KIN4 ? { ...KIN_T, pkr: [5.9, 7.1], solid: [5.9, 6.9], kinOut: [6.9, 7.9], arrow: [8.0, 9.0], eifP: [9.2, 10.4] }
  : { ...KIN_T, kin: [98, 99], kinOut: [98, 99], chart: [3.5, 4.3], pkr: [5.8, 7.0], solid: [5.8, 6.8], arrow: [7.2, 8.2], eifP: [8.4, 9.6] };
const withKinT = (T, fn) => { const keep = { ...KIN_T }; Object.assign(KIN_T, T); try { fn(); } finally { for (const k of Object.keys(KIN_T)) if (!(k in keep)) delete KIN_T[k]; Object.assign(KIN_T, keep); } };
STEPDEF.kinaseC = {
  noXfade: true,
  apply(S, t) { withKinT(KIN_T_B, () => STEPDEF.kinase.apply(S, kinTT(t))); S.panelK = 1; S.panelShort = 1 - seg(t, ...PANEL_GROW); },      // the panel is already up (S9A); it grows back slowly, then Fig. 1K
  over(S, t, gt) { eifSchematic(S, panelRect(S), 1 - A(t, 0, .8), EIFS.dur, gt); withKinT(KIN_T_B, () => STEPDEF.kinase.over(S, kinTT(t), gt)); },      // the schematic clears as the kinases come in
};
/* A chart on the square data panel (scenes 9 and 11): title (34 px, wrapped), then the chart drawn KC times larger (bars, axis,
   tick and axis labels all grow together), the figure number right-aligned on the plot level with the asterisk, and an optional
   takeaway along the bottom. o: barChart options (o.a is the alpha of everything). */
const KC = 1.3, SQ_FOOT_GAP = 22;
const sqFootTop = (S, n) => { const R = panelRect(S); return R.y + R.h - 30 - figFootH(n) - SQ_FOOT_GAP; };      // y just above a square-panel footnote of n lines
function sqChart(S, title, D, fig, o, take = null, figAt = 'star', reserve = 0, kc = KC, topPad = 4) {      // figAt: 'star' = level with the asterisk, 'axis' = top level with the top of the y axis, 'bottom' = bottom right corner of the panel, under everything; reserve: px left free under the chart; kc: chart scale
  const a = o.a ?? 1; if (a <= .004) return;
  const R0 = panelRect(S), R = o.dx ? { ...R0, x: R0.x + o.dx, w: R0.w - o.dx } : R0;      // o.dx: everything shifted right (the panel stays)
  const y1 = o.titleSize ? (txtFit(title, R.x + 40, R.y + 74, { size: o.titleSize, w: 600, a }, R.w - 72), R.y + 74 + 42) : wrapTxt(title, R.x + 40, R.y + 74, R.w - 72, { size: 34, w: 600, a }, 42);      // o.titleSize: one larger line (shrunk to fit), the chart stays where it was
  let bot = R.y + R.h - 26;
  if (take && take.a > .004) { const to = { size: 27, w: 600 }, n = wrapLines(take.s, R.w - 80, to); wrapTxt(take.s, R.x + 40, R.y + R.h - 34 - (n - 1) * 35, R.w - 80, { ...to, a: take.a }, 35); }
  if (take) bot = R.y + R.h - 34 - (wrapLines(take.s, R.w - 80, { size: 27, w: 600 }) - 1) * 35 - 46;
  if (o.foot) {      // o.footAt: 'axis' = left edge on the chart's y axis, 'matrix' = on the x-axis row name (AβOs), else the panel margin
    const padL = D.ylab ? 92 + ([].concat(D.ylab).length - 1) * 24 : 62, ax = R.x + 22 + padL * kc;
    const fx = o.footAt === 'axis' ? ax : o.footAt === 'matrix' && D.matrix ? ax - (12 + txtW(D.matrix[0].name, { size: 20, w: 600 })) * kc : R.x + 40;
    const fb = R.y + R.h - 30; figFoot(o.foot, fx, fb, R.x + R.w - 32 - fx, a); bot = Math.min(bot, fb - figFootH(o.foot.length) - SQ_FOOT_GAP); }      // methods footnote along the bottom; the chart sits above it
  bot -= reserve; if (figAt === 'bottom') { bot -= 34; txt(fig, R.x + R.w - 28, R.y + R.h - 24, { size: 20, w: 600, col: COL.dim, align: 'right', a }); }
  const cx = R.x + 22, cy = y1 + topPad, cw = R.w - 56, ch = bot - cy, lw = cw / kc, lh = ch / kc;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(kc, kc);
  barChart({ x: 0, y: 0, w: lw, h: lh }, D, o);
  // the figure number, top right of the plot, level with the asterisk (barChart's own geometry, see its padT / padB)
  { const note = D.note || (D.n ? 'n' : ''), padT = D.title ? (D.unit ? 62 : 48) : 26, padB = (D.matrix ? 22 + D.matrix.length * 30 : (D.bars.some(b => b.sub) ? 62 : 40)) + (D.groups ? 44 : 0) + (note ? 34 : 6);
    const ph = lh - padT - padB, sb = D.bars.find(b => b.star) || D.bars[0], sy = padT + ph - (sb.mean + (sb.sem || 0)) / D.ymax * ph - 8;
    if (figAt === 'bottom' || figAt === 'none') { }
    else if (figAt === 'axis') txt(fig, lw - 4, padT - 4, { size: 20, w: 600, col: COL.dim, align: 'right', base: 'top', a });
    else txt(fig, lw - 4, sy - 9, { size: 20, w: 600, col: COL.dim, align: 'right', base: 'middle', a }); }
  ctx.restore();
}
function kinaseChart(S, t) {      // Fig. 1K
  const T = KIN_T, a = A(t, ...T.chart), c0 = T.chart[0];
  sqChart(S, 'PKR inhibition blocks phosphorylation', EIFK_CH(), 'Fig. 1K', { a, grow: i => i < 2 ? A(t, c0 + .6 + i * .5, c0 + 1.8 + i * .5) : A(t, c0 + 1.8, c0 + 3), sem: A(t, c0 + 3.2, c0 + 3.8), star: A(t, c0 + 3.6, c0 + 4.1), lab: i => i < 2 ? 1 : A(t, c0 + 1.6, c0 + 2.2),
    foot: ['AβOs ± PKR inhibitor, 3h; n=3 independent cultures', 'Mean ± SEM, *p < 0.05, ANOVA + Bonferroni'], mxDy: 8, titleSize: 38 });
}
/* 5c. In vivo models
   After the culture result (Fig. 1K): the chart clears, a second square panel appears on the left, and the two animal models are
   introduced (monkey left, mouse right). The fork clip opens by sending the mouse panel home as the data panel. */
STEPDEF.vivoCard = {
  apply(S, t) {
    const V = S.vivo;
    V.k = 0; V.a = 0; V.left = A(t, .8, 1.6); V.lc = A(t, 1.4, 2.4); V.c = V.lc;      // both panels' contents come in together
  },
  over(S, t, gt) {
    const o = 1 - A(t, 0, .6);                            // the kinase clip's chart clears first
    if (o > .004) { ctx.save(); ctx.globalAlpha *= o; STEPDEF.kinaseC.over(S, STEPS.find(s => s.fn === 'kinaseC').dur, gt); ctx.restore(); }
    vivoPanels(S);
  },
};

/* 6. The fork appears */
const IRS5A_CH = () => ({ ylab: 'Normalized IRS-1pSer636 (a.u.)', fig: '', ymax: 3, ticks: [0, 1, 2, 3], note: '',
  matrix: [{ name: 'AβOs', vals: ['−', '+', '−', '+'] }], groups: [{ label: 'WT', from: 0, to: 1 }, { label: 'TNFR1−/−', from: 2, to: 3 }],
  bars: DATA.IRS_TNFR1.bars.map((b, i) => ({ ...b, col: i === 1 ? PC.phos : undefined, colA: i === 1 ? 1 : undefined, gap: i === 2 ? 1 : 0 })) });
/* Scene 11 beats, seconds. The panels clear (the right one stays where it is, square); the insulin receptor and its dot stream to
   IRS-1; the proposed PKR-P → IRS-1 arrow; IRS-1 → IRS-1pSer; the stream greys and halts and a big down arrow bobs beside
   "insulin signal" (long beat: talked over); then Fig. 5A on the square panel and the TNFR1−/− pair steps back. */
const FORK_T = { ir: [1.2, 2.2], irs: [1.6, 2.6], arrow: [3.4, 4.4], irsP: [5.0, 6.2], dead: [7.0, 8.0], down: [7.6, 8.2], bobs: [8.2, 11.2], chart: [12.0, 12.8], dimKO: [17.4, 18.6] };
const FORK_BOBS = 3;
STEPDEF.fork = {
  apply(S, t) {
    const V = S.vivo, T = FORK_T; V.c = 1 - A(t, .1, 1.5); V.left = 1 - A(t, .1, 1.5); V.k = 0;      // monkey panel and both panels' contents go together V.a = 0;
    mv(S.n.ir, 'a', 1, A(t, ...T.ir)); mv(S.n.irs, 'a', 1, A(t, ...T.irs));
    mv(S.e.pkr_irs, 'show', 1, A(t, ...T.arrow)); mv(S.n.irs, 'lit', 1, A(t, ...T.irsP));
    const ir = S.n.ir, dead = tt => A(tt, ...T.dead);
    ir.dead = dead(t); ir.live = 0;
    { let ph = 0; const n = 80, dt = t / n; for (let i = 0; i < n; i++) ph += (1 - dead((i + .5) * dt)) * dt; ir.ph = ph; }      // stream phase: slows to a stop with the greying
    ir.arrow = A(t, ...T.down); ir.bobN = FORK_BOBS; ir.bob = seg(t, ...T.bobs) * FORK_BOBS;
  },
  over(S, t, gt) {
    vivoPanels(S);
    const T = FORK_T, c0 = T.chart[0], a = A(t, ...T.chart), dimKO = A(t, ...T.dimKO);
    // Fig. 5A whole (WT and TNFR1−/−), then the knockout pair steps back and the WT pair holds the eye
    sqChart(S, 'TNFR1 Mediates IRS-1 Inhibition', IRS5A_CH(), 'Fig. 5A', { a, grow: i => A(t, c0 + .6 + i * .45, c0 + 1.8 + i * .45), sem: A(t, c0 + 3.2, c0 + 3.8), star: A(t, c0 + 3.6, c0 + 4.1), barA: i => i < 2 ? 1 : lerp(1, .22, dimKO),
      foot: ['2-3mo. mice, IRS-1pSer636 normalized to total IRS-1', 'n=7/cond., mean ± SEM, *p<0.05, ANOVA + Bonferroni'], titleSize: 38 }, null, 'axis');
  },
};

/* S11v2: the fork straight after S9B, no in-vivo card (S10). Fig. 1K fades off the panel as the fork begins; the rest is S11.
   Only in the ?s11v2=1 step list (app.js), where it takes the place of S10 + S11: gtDur covers both, and the clip's clock runs
   that much faster (gtWarp) so its last frame is S12A's first. */
STEPDEF.forkV2 = {
  noXfade: true,
  apply(S, t) { STEPDEF.fork.apply(S, t); S.vivo.c = 0; S.vivo.left = 0; },
  over(S, t, gt) {
    const o = 1 - A(t, .1, 1.1);
    if (o > .004) { ctx.save(); ctx.globalAlpha *= o; STEPDEF.kinaseC.over(S, STEPS.find(s => s.fn === 'kinaseC').dur, gt); ctx.restore(); }
    STEPDEF.fork.over(S, t, gt);
  },
};

/* 7. Push eIF2α directly */
const COLOC_CH = () => ({ title: 'synapses (colocalized puncta)', unit: 'Syp + PSD-95, cultured neurons (a.u.)', fig: 'redrawn from Fig. 4H', ymax: 200, ticks: [0, 50, 100, 150, 200], n: 4, nUnit: 'independent cultures',
  bars: [{ ...DATA.COLOC_PUNCTA_SAL.bars[0], label: 'vehicle', open: true }, { ...DATA.COLOC_PUNCTA_SAL.bars[1], label: 'salubrinal' }] });
const UPSTREAM = ['abo_tnf', 'abo_dir', 'tnf_tnfr', 'tnfr_pkr', 'pkr_eif', 'pkr_irs'];
/* Scene 12 beats, seconds. The square panel stays. The solid arrow eIF2α-P → synapses draws and the synapses arrive; they turn
   into "synapse loss" (label, colour, glyph); Fig. 4A builds on the panel (the two arenas under it drive the bars); then the chart
   and the panel go, and "memory impairment" is revealed, as one label, at the end of a longer dashed arrow from the synapses. */
// bypass: everything upstream of eIF2α greys (AβOs desaturate but stay), eIF2α too for a beat; then salubrinal makes eIF2α gold
const IRS5H_CH = () => ({ ylab: 'IRS-1pSer636 / total IRS-1 (a.u.)', fig: '', ymax: 1.5, ticks: [0, .5, 1, 1.5], note: '', bars: DATA.IRS_SAL_MICE.bars.map(b => ({ ...b, label: b.label === 'Vehicle' ? 'Veh' : 'Sal' })) });      // Fig. 5H, salubrinal mice
const fig5H = (S, a) => { if (a > .004) sqChart(S, 'IRS-1 never moves', IRS5H_CH(), 'Fig. 5H', { a, dx: 26, labSize: 26, labDy: 8, foot: ['Fig. 5H: Salubrinal 1 mg/kg i.p. × 7d', 'n=7 / cond.; mean ± SEM, n.s'] }, null, 'none', 0, 1); };
// the ring drawn round IRS-1 and its label (end of scene 12; it leaves at the start of the next clip). c: how much is drawn
function irsRing(S, c, a) {
  if (c <= .004 || a <= .004) return;
  const P = nodeXY(S, 'irs'), cx = P[0] - 12, cy = P[1] + 44, rx = 150, ry = 112;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgb(COL.text); ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -.08, -Math.PI * .6, -Math.PI * .6 + TAU * 1.04 * c); ctx.stroke(); ctx.restore();      // drawn on, overshooting a little like a hand-drawn ring
}
// salubrinal's pill and pointer at eIF2α (scene 12; it leaves at the start of the next clip with the panel)
// Font Awesome Free 'lock' (CC BY 4.0), 640-unit box; the glyph spans x 128-512, y 32-576
const LOCK_PATH = typeof Path2D !== 'undefined' ? new Path2D('M256 160L256 224L384 224L384 160C384 124.7 355.3 96 320 96C284.7 96 256 124.7 256 160zM192 224L192 160C192 89.3 249.3 32 320 32C390.7 32 448 89.3 448 160L448 224C483.3 224 512 252.7 512 288L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 288C128 252.7 156.7 224 192 224z') : null;
function lockIcon(xr, yb, h, a) {      // right edge xr, bottom yb, h px tall, white
  if (!LOCK_PATH || a <= .004) return; const k = h / 544;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(xr - 512 * k, yb - 576 * k); ctx.scale(k, k); ctx.fillStyle = rgb(COL.ink); ctx.fill(LOCK_PATH); ctx.restore();
}
// the pill sits left of eIF2α at the height of the eIF2α-P → synapse arrow, a lock over its right end; la: the lock's alpha
function salPill(S, pa, sl, la) {
  const E = nodeXY(S, 'eif'), ya = lerp(E[1], nodeXY(S, 'syn')[1], .3), x = E[0] - lerp(260, 172, sl);
  const w = pill('salubrinal', x, ya, { a: pa, size: 23 }), h = 23 * 1.7;
  lockIcon(x + w / 2 + 24, ya - h / 2 - 8, 32, pa * la);      // a little past the pill's right end, towards eIF2α's P
}
// the insulin stream's phase through scene 12: dead while IRS-1 still has its P, running once the bypass has taken it off
const salPh = t => { let ph = 0; const n = 80, dt = t / n; for (let i = 0; i < n; i++) ph += A((i + .5) * dt, ...SAL_T.bypass) * dt; return ph; };
const SAL_T0 = 5.2;      // where the synapse beats start (after the bypass and salubrinal)
const SAL_T = { bypass: [.7, 2.4], pill: [2.6, 3.4], pillSlide: [2.6, 4.0], pointer: [3.6, 4.2], eifP: [4.2, 5.2] };
for (const [k, v] of Object.entries({ syn: [.3, 1.5], synA: [.9, 1.7], synLoss: [2.2, 3.6], chart: [4.2, 5.0], run1: [5.2, 9.2], run2: [6.6, 10.6], sal: [5.8, 6.6], sem: [11.0, 11.6], star: [11.6, 12.1], out: [14.2, 14.8], half: [14.8, 16.6], memArrow: [16.2, 17.2], mem: [16.6, 17.4], ring: [17.9, 19.1], h5: [19.6, 20.1] })) SAL_T[k] = v.map(x => x + SAL_T0);
STEPDEF.salubrinal = {
  apply(S, t) {
    const T = SAL_T;
    S.vivo.k = 0; { const ir = S.n.ir; ir.live = 0; ir.phG = 0; ir.phAdd = salPh(t); }      // the square panel stays where it is; the insulin stream picks up speed smoothly as IRS-1 loses its P (phase integrated, no jump)
    // bypass: no AβOs signal, no TNF-α, no PKR activation. Upstream greys: TNFR1's chains spread apart, PKR and IRS-1 lose their P
    // (so the insulin stream resumes and "signal ↓" goes), eIF2α greys for a beat. The AβOs only desaturate: still on screen.
    const b = A(t, ...T.bypass);
    for (const k of ['abo', 'tnf', 'tnfr', 'pkr']) mv(S.n[k], 'off', 1, b);      // (IRS-1 just loses its P below: back to its resting grey)
    mv(S.n.tnf, 'up', 0, b); mv(S.n.tnfr, 'lit', 0, b); mv(S.n.tnfr, 'bound', 0, b); mv(S.n.pkr, 'lit', 0, b); mv(S.n.irs, 'lit', 0, b); mv(S.n.eif, 'lit', 0, b);
    for (const k of UPSTREAM) S.dimEdges[k] = lerp(S.dimEdges[k] || 0, 1, b);
    mv(S, 'micTag', .4, b);
    mv(S.n.eif, 'lit', 1, A(t, ...T.eifP));              // salubrinal goes in at eIF2α
    { const d = A(t, ...T.syn); mv(S.e.eif_syn, 'show', 1, d); mv(S.e.eif_syn, 'solid', 1, d); }
    mvs(S.n.syn, { a: 1 }, A(t, ...T.synA)); mv(S.n.syn, 'loss', 1, A(t, ...T.synLoss));
    S.panelK = 1; S.panelHalf = A(t, ...T.half);          // the panel's contents fade, then it narrows to half width (right edge fixed)
    mv(S.e.syn_mem, 'show', 1, A(t, ...T.memArrow)); mvs(S.n.mem, { a: 1 }, A(t, ...T.mem)); if (t >= T.mem[0]) S.n.mem.loss = 1;      // already "impairment" when it starts to show: one label
  },
  over(S, t, gt) {
    const T = SAL_T;
    salPill(S, A(t, ...T.pill), eOut(seg(t, ...T.pillSlide)), A(t, ...T.pointer));      // left of eIF2α, then the lock appears over it
    fig5H(S, A(t, ...T.h5));                             // Fig. 5H on the narrowed panel: shown whole, no build (IRS-1 does not move with salubrinal)
    const na = A(t, ...T.chart) * (1 - A(t, ...T.out)); if (na <= .004) return;
    // Fig. 4A on the square panel; the two arenas (no object labels) sit side by side under it, and the mice's exploration builds the bars
    const R = panelRect(S), AH = 112, aw = 236, ay = sqFootTop(S, 2) - AH;      // the arenas: between the chart and the footnote
    // under their groups: vehicle's right edge on the end of the vehicle line, salubrinal's left edge on the start of its line (barChart's geometry, scaled by KC)
    const pw = (R.w - 56) / KC - 92 - 58, slot = (pw - 26) / 4, bw = Math.min(slot * .68, 86), gx = u => R.x + 22 + (92 + u) * KC;
    const xVehR = gx(1.5 * slot + bw / 2), xSalL = gx(26 + 2.5 * slot - bw / 2);
    const  C = NOR_COL, ao = { labels: false, oCol: C.old, nCol: C.new };
    const u1 = seg(t, ...T.run1), u2 = seg(t, ...T.run2), a2 = A(t, ...T.sal);
    const P1 = norArena({ x: xVehR - aw, y: ay, w: aw, h: AH }, 'veh', u1, na, gt, '', ao), P2 = norArena({ x: xSalL, y: ay, w: aw, h: AH }, 'sal', u2, na * a2, gt, '', ao);
    const bars = norBars(DATA.NOR_SALUBRINAL, { subs: [['', ''], ['', '']] }).map((b, i) => ({ ...b, lcol: i % 2 ? C.new : C.old }));      // plain bars (Felix: no colour in the bars themselves); the labels keep the object colours      // salubrinal's open 'old' bar: border in the 'old' colour
    sqChart(S, 'eIF2α-P Drives Memory Deficits', { ...NOR_CH(), title: '', unit: '', fig: '', n: 0, note: '', ylab: 'exploration time (%)', bars,
      groups: [{ label: 'vehicle', from: 0, to: 1 }, { label: 'salubrinal', from: 2, to: 3, a: a2 }] }, 'Fig. 4A',
      { a: na, grow: i => i === 0 ? P1.fO : i === 1 ? P1.fN : i === 2 ? (P2 ? P2.fO : 0) : (P2 ? P2.fN : 0), sem: A(t, ...T.sem), star: A(t, ...T.star), lab: i => i < 2 ? 1 : a2, foot: ['Novel object recognition, ♂ Swiss mice, n=10 per group', 'Mean ± SEM, *p < 0.05 vs 50% (chance)'], titleSize: 38 }, null, 'axis', AH + 2, KC, -14);
  },
};

const SAL_SPLIT = 18.0, SAL_DUR = 27.2;      // S12A = salubrinal 0..18.0 s, S12B = the rest on the same clock (every beat is either done or not started at the cut)
STEPDEF.salubrinalB = { noXfade: true, apply(S, t) { STEPDEF.salubrinal.apply(S, SAL_SPLIT + t); }, over(S, t, gt) { STEPDEF.salubrinal.over(S, SAL_SPLIT + t, gt); } };

/* 12b. The open branch, then Fig. 7
   Everything comes back to the disease state (the state the Fig. 7 morph starts from; the ER is not on the board yet), the panel and
   Fig. 5H, the salubrinal pill and the ring round IRS-1 (drawn at the end of scene 12) go; the dashed IRS-1 → memory arc draws, then its "?"; the
   board reorganises into the paper's Fig. 7, with the original panel beside it. Ends there. */
const IRSQ_T = { back: [.4, 2.0], panel: [.2, 1.0], arc: [.3, 2.0], q: [2.0, 2.5], legendOut: [2.0, 2.7], morph: [2.7, 5.7], jnk: [4.9, 6.1], fig: [4.9, 5.7], shift: [4.9, 6.3] };      // the glide left runs with the pJNK / IKK arrow (Felix)      // the IRS-1 → memory arc draws from the start; the Fig. 7 rearrangement takes 3.0 s (was 5.4); the glide left is unchanged (1.4 s)      // the reorganisation starts as the legend finishes leaving
// end of scene 13: the whole Fig. 7 chain glides left until the IRS-1 glyph's left edge (54.5 glyph units left of its node, rim included) is on the citation's left edge
const F7_DX = -224;      // Felix's position: the "?" under the IRS-1 → memory arrow sits just right of the footer's end (x ≈ 456)
STEPDEF.irsQuestion = {
  apply(S, t) {
    const T = IRSQ_T, k = A(t, ...T.back);
    diseaseState(S, k); mv(S.n.mem, 'loss', 1, k);
    mv(S, 'panelK', 0, A(t, ...T.panel));
    // IRS-1 takes its P again, so the insulin stream greys and slows to a stop (integrated here on this step's clock)
    { const ir = S.n.ir, dead = tt => A(tt, ...T.back); ir.live = 0; ir.phG = 0; let ph = salPh(SAL_DUR); const n = 60, dt = t / n; for (let i = 0; i < n; i++) ph += (1 - dead((i + .5) * dt)) * dt; ir.phAdd = ph; }      // carries on from where scene 12 left the dots
    // the open branch: IRS-1 → memory, dashed, and then its "?"
    mv(S.e.irs_mem, 'show', 1, A(t, ...T.arc)); S.irsQ = A(t, ...T.q);
    // the reorganisation into Fig. 7 (as the old scene 14: the direct AβO → PKR arrow and the insulin receptor go; pJNK / IKK arrives)
    const m = A(t, ...T.morph);
    mv(S, 'lay', 1, m); mv(S, 'legendH', 0, A(t, ...T.legendOut)); mv(S.n.ir, 'a', 0, A(t, T.morph[0], T.morph[0] + 1.8)); mv(S, 'dirA', 0, A(t, T.morph[0], T.morph[0] + 1.8));      // the arrow legend goes as soon as the IRS-1 → memory line is drawn
    mv(S.n.jnk, 'a', 1, A(t, ...T.jnk)); mv(S.e.jnk, 'show', 1, A(t, ...T.jnk));
    mv(S, 'f7dx', F7_DX, A(t, ...T.shift));      // instead of the original figure: the chain moves over to the left, all the way to the citation's edge
  },
  over(S, t, gt) {
    const T = IRSQ_T, fa = 1 - A(t, ...T.panel);
    // the previous clip's Fig. 5H, salubrinal pill and IRS-1 ring all leave with the panel
    if (S.panelHalf > .5) fig5H(S, fa);
    salPill(S, fa, 1, 1);
  },
};
/* 8. Push the other input */
const THAPS_CH = () => ({ title: 'IRS-1pSer636 in dendrites', unit: 'immunofluorescence (a.u.)', fig: 'from Fig. 5D', ymax: 3.4, ticks: [0, 1, 2, 3], n: 3, nUnit: 'independent experiments',
  bars: [{ ...DATA.IRS_THAPS.bars[0], label: 'vehicle' }, { ...DATA.IRS_THAPS.bars[1], label: 'thapsigargin', col: PC.phos, colA: 1 }, { ...DATA.IRS_THAPS.bars[2], label: 'thapsigargin', sub: '+ 4-PBA' }] });
STEPDEF.thaps = {
  apply(S, t) {
    mv(S, 'f7dx', 0, A(t, .1, 1.5));      // the Fig. 7 chain comes back from the left (scene 13 moved it)
    S.vivo.k = A(t, .1, 1.5); mv(S, 'panelK', 1, A(t, .1, 1.0)); mv(S, 'panelHalf', 0, A(t, .1, 1.5));      // (stopgap until scene 13 is reworked) the panel returns, at its old place, for the chart
    const r = A(t, .7, 2.2); mv(S.n.eif, 'lit', 0, r); mv(S.n.ribo, 'stall', 0, r); mv(S.n.syn, 'loss', 0, r); mv(S.n.mem, 'loss', 0, r);
    mv(S.n.er, 'a', 1, A(t, 1.2, 2.4)); mv(S.n.er, 'lit', 1, A(t, 4, 5.2));
    mv(S.e.er_irs, 'show', 1, A(t, 4.8, 5.8)); mv(S.n.irs, 'lit', 1, A(t, 5.6, 6.8));
    mv(S.n.eif, 'lit', 1, A(t, 7, 8)); mv(S.n.ribo, 'stall', 1, A(t, 7.4, 8.4));
    const pba = hold(t, 9.4, 10.6, 16.4, 17.4); S.n.er.lit *= 1 - pba * .75; S.n.irs.lit *= 1 - pba * .7; S.n.eif.lit *= 1 - pba * .5;
    mv(S.e.er_irs, 'solid', 1, A(t, 11.6, 12.6));
    S.grid.hot = t > 17.6 ? 'thaps' : null; mv(S.grid.cells.thaps, 1, 1, seg(t, 18.2, 19)); mv(S.grid.cells.thaps, 0, 1, seg(t, 19.2, 20)); mv(S.n.mem, 'loss', 1, A(t, 19.2, 20.2)); S.grid.hot = null;
  },
  over(S, t, gt) {
    const R = nodeXY(S, 'er'), C = { ...LAY.chart, x: PANEL.x + 26, w: PANEL.w - 52 };
    const pa = A(t, 2.6, 3.4), sl = eOut(seg(t, 2.6, 4));
    pill('thapsigargin', R[0] + 52, R[1] - lerp(210, 132, sl), { a: pa, size: 23 });
    const ba = hold(t, 9, 9.8, 16.4, 17.2), s2 = eOut(seg(t, 9, 10.4));
    pill('4-PBA', R[0] + 72, R[1] + lerp(190, 140, s2), { a: ba, sub: 'chemical chaperone, 1 mM', size: 23 });
    barChart({ ...C, h: 484 }, THAPS_CH(), { a: A(t, 5.2, 6), grow: i => i < 2 ? A(t, 5.8 + i * .5, 7 + i * .5) : A(t, 10, 11.2), sem: A(t, 11.4, 12), dots: seg(t, 11.6, 12.3), star: A(t, 11.8, 12.3), lab: i => i < 2 ? 1 : A(t, 9.4, 10) });
    txtFit('thapsigargin also raises eIF2α-P (Fig. S5A-B)', C.x + 4, 706, { size: 19, w: 500, col: COL.dim, a: hold(t, 7.2, 8, 16.8, 17.4) }, C.w - 8);
    txtFit('a second input to IRS-1 that eIF2α-P cannot explain', C.x + 4, 770, { size: 21, w: 600, a: A(t, 17.4, 18.2) }, C.w - 8);
    txtFit('‡ thapsigargin i.c.v. also impaired memory (Fig. S5C-D)', C.x + 4, 804, { size: 18, w: 500, col: COL.dim, a: A(t, 19.6, 20.4) }, C.w - 8);
  },
};

/* 9. Resolve to Figure 7 */
function diseaseState(S, k) {            // every node as it stands with AβOs present
  for (const n of ['abo', 'tnf', 'tnfr', 'pkr']) mv(S.n[n], 'off', 0, k);
  mv(S.n.tnf, 'up', 1, k); mv(S.n.tnfr, 'lit', 1, k); mv(S.n.tnfr, 'bound', 1, k); mv(S.n.pkr, 'lit', 1, k); mv(S.n.eif, 'lit', 1, k); mv(S.n.irs, 'lit', 1, k); mv(S.n.er, 'lit', 1, k);
  mv(S.n.ribo, 'stall', 1, k); mv(S.n.syn, 'loss', 1, k); mv(S.n.mem, 'loss', 1, k); mv(S, 'micTag', 1, k);
  for (const e of UPSTREAM) S.dimEdges[e] = lerp(S.dimEdges[e] || 0, 0, k);
}
function baselineState(S, k) {           // vehicle: nothing lit
  for (const n of ['abo', 'tnf', 'tnfr', 'pkr']) mv(S.n[n], 'off', 0, k);
  mv(S.n.tnf, 'up', 0, k); mv(S.n.tnfr, 'lit', 0, k); mv(S.n.tnfr, 'bound', 0, k); mv(S.n.pkr, 'lit', 0, k); mv(S.n.eif, 'lit', 0, k); mv(S.n.irs, 'lit', 0, k); mv(S.n.er, 'lit', 0, k);
  mv(S.n.ribo, 'stall', 0, k); mv(S.n.syn, 'loss', 0, k); mv(S.n.mem, 'loss', 0, k);
}
const F7 = { x: 1400, y: 50, w: 450, h: 980 }, F7_LIST = 1128;      // the original Fig. 7: the full height of the 1080 stage (the legend has gone by then)
STEPDEF.figure7 = {
  apply(S, t) {
    diseaseState(S, A(t, .7, 2.4));
    { const k = A(t, .7, 2.4); mv(S.e.eif_syn, 'show', 1, k); mv(S.e.eif_syn, 'solid', 1, k); mv(S.e.syn_mem, 'show', 1, k); mv(S.e.syn_mem, 'solid', 1, k); mv(S.e.irs_mem, 'show', 1, k);
      mv(S.e.eif_irs, 'show', 1, k); mv(S.e.eif_irs, 'solid', 1, k); mv(S.e.eif_irs, 'strike', 1, k); mvs(S.n.syn, { a: 1 }, k); mvs(S.n.mem, { a: 1 }, k); }      // Fig. 7's edges, as scenes 12-13 used to leave them
    mv(S, 'lay', 1, A(t, 2.8, 8.2)); mv(S, 'legendH', 0, A(t, 2.8, 8.2)); mv(S.n.ir, 'a', 0, A(t, 2.8, 4.6));
    mv(S, 'dirA', 0, A(t, 2.8, 4.6)); mv(S, 'eifIrsA', .35, A(t, 2.8, 8.2)); mv(S, 'erA', .35, A(t, 2.8, 8.2));      // the direct AβO → PKR arrow and "via microglia?" go with the insulin receptor; eIF2α-P → IRS-1 dims to half      // the arrow legend leaves with the cytoplasm
    mv(S.n.ir, 'a', 0, A(t, 2.8, 4.6)); mv(S.n.ribo, 'a', 0, A(t, 2.8, 4.6));
    mv(S.n.jnk, 'a', 1, A(t, 7.2, 8.6)); mv(S.e.jnk, 'show', 1, A(t, 7.2, 8.6));      // glyph and label arrive with the arrow
  },
  over(S, t, gt) {
    receipt('fig7', A(t, 8.8, 9.6), 'Fig. 7', F7);
  },
};

/* 10-13: the knockout block (owner: teammate). Same board, Fig. 7 layout, nodes removed. */
const norCh = (P, fig, subs) => ({ title: 'novel object recognition', unit: 'exploration time (%)', fig, ymax: 85, ticks: [0, 25, 50, 75], ref: { v: 50, label: '50%' }, n: P.n, nDots: P.nDots, nUnit: 'mice per group', bars: norBars(P, { subs }).map((b, i) => i % 2 ? { ...b, sub: ' ' } : { ...b, sub: subs[i / 2].join(' '), subDx: .5, subSize: 13 }) });
const irsCh = (P, fig, unit) => ({ title: 'IRS-1pSer636', unit, fig, ymax: 3, ticks: [0, 1, 2, 3], n: P.n, nUnit: 'mice per condition', bars: P.bars.map((b, i) => ({ ...b, label: b.sub === 'AβOs' ? 'AβOs' : 'veh', sub: b.label, gap: i === 2 ? 1 : 0 })) });
const sideList = (t, t0, lines) => lines.forEach(([s, fig], i) => { const a = A(t, t0 + i * .7, t0 + .8 + i * .7), y = 262 + i * 60; txt(s, 1082, y, { size: 20, w: 600, a }); txt(fig, 1082, y + 24, { size: 17, w: 500, col: COL.dim, a }); });
STEPDEF.koTnfr = {
  apply(S, t) {
    mv(S, 'legendH', 0, A(t, 0, .5));                      // the legend belongs to steps 7-14 (Felix's block)
    mv(S, 'eifIrsA', 1, A(t, 0, 1.5)); mv(S, 'erA', 1, A(t, 0, 1.5));      // eIF2α-P → IRS-1 and the ER stress branch come back to full strength
    baselineState(S, A(t, .7, 2.2)); mv(S.n.tnfr, 'ko', 1, A(t, 2.2, 3.6));
    mv(S.n.tnf, 'up', 1, A(t, 4.6, 5.8));
    S.grid.hot = t > 15 ? 'tnfr' : null; mv(S.grid.cells.tnfr, 0, 1, seg(t, 15.6, 16.4)); mv(S.grid.cells.tnfr, 1, 1, seg(t, 16.6, 17.4)); S.grid.big = hold(t, 14.8, 15.6, 17.9, 18.7);
  },
  over(S, t, gt) {
    const Ab = nodeXY(S, 'abo');
    pill('AβOs i.c.v.', Ab[0] - 150, Ab[1], { a: A(t, 3.8, 4.6), sub: '10 pmol', col: PC.abo, tcol: [255, 255, 255] });
    tag('TNF-α rises, but has no receptor', 716, nodeXY(S, 'tnfr')[1] + 34, { a: hold(t, 5.8, 6.6, 9.4, 10.2), size: 20, col: COL.dim, align: 'left' });
    sideList(t, 6.6, [['phospho-PKR: no rise', 'Fig. 3D'], ['eIF2α-P: no rise', 'Fig. 3E'], ['Syp, PSD-95: preserved', 'Fig. 3F'], ['fear memory: preserved', 'Fig. 3C']]);
    barChart(LAY.chart, norCh(DATA.NOR_TNFR1, 'Fig. 3B', [['WT', 'veh'], ['WT', 'AβOs'], ['TNFR1−/−', 'veh'], ['TNFR1−/−', 'AβOs']]), { a: A(t, 5.4, 6.2), grow: i => A(t, 6 + i * .3, 7.2 + i * .3), sem: A(t, 9.6, 10.2), dots: seg(t, 9.8, 10.6), star: A(t, 10.2, 10.7) });
    barChart(LAY.receipt, irsCh(DATA.IRS_TNFR1, 'Fig. 5A', '/ total IRS-1 (a.u.)'), { a: A(t, 10.6, 11.4), grow: i => A(t, 11.2 + i * .35, 12.4 + i * .35), sem: A(t, 13.2, 13.8), dots: seg(t, 13.4, 14), star: A(t, 13.6, 14) });
  },
};
STEPDEF.koPkr = {
  apply(S, t) {
    mv(S.n.tnfr, 'ko', 0, A(t, .7, 2)); mv(S.n.pkr, 'ko', 1, A(t, 2, 3.4));
    mv(S.n.tnfr, 'bound', 1, A(t, 3.6, 4.6)); mv(S.n.tnfr, 'lit', 1, A(t, 4, 5));
    mv(S, 'dagger', 1, A(t, 14, 14.8)); mv(S.e.pkr_irs, 'solid', 1, A(t, 14.4, 15.4));
    S.grid.hot = t > 16 ? 'pkr' : null; mv(S.grid.cells.pkr, 0, 1, seg(t, 16.6, 17.4)); mv(S.grid.cells.pkr, 1, 1, seg(t, 17.6, 18.4)); S.grid.big = hold(t, 15.8, 16.6, 18.9, 19.7);
  },
  over(S, t, gt) {
    tag('TNFR1 is engaged, the kinase is missing', 716, nodeXY(S, 'pkr')[1] + 38, { a: hold(t, 4.6, 5.4, 9, 9.8), size: 20, col: COL.dim, align: 'left' });
    sideList(t, 6.2, [['eIF2α-P: no rise', 'Fig. 3I'], ['fear memory: preserved', 'Fig. 3H'], ['synapse loss: eased by', 'a PKR inhibitor, Fig. 3J-M']]);
    barChart(LAY.chart, norCh(DATA.NOR_PKR, 'Fig. 3G', [['WT', 'veh'], ['WT', 'AβOs'], ['PKR−/−', 'veh'], ['PKR−/−', 'AβOs']]), { a: A(t, 4.8, 5.6), grow: i => A(t, 5.4 + i * .3, 6.6 + i * .3), sem: A(t, 9, 9.6), dots: seg(t, 9.2, 10), star: A(t, 9.6, 10.1) });
    barChart(LAY.receipt, irsCh(DATA.IRS_PKR, 'Fig. 5B', '/ β-actin (a.u.)'), { a: A(t, 10, 10.8), grow: i => A(t, 10.6 + i * .35, 11.8 + i * .35), sem: A(t, 12.6, 13.2), dots: seg(t, 12.8, 13.4) });
    txt('† no AβO-induced rise in WT 129/SvEv; PKR−/− lower than WT (*)', 84, 728, { size: 18, w: 600, col: COL.text, a: hold(t, 13, 13.8, 21.4, 22) * 0 });
    tag('† WT 129/SvEv:', 1082, 444, { a: A(t, 13, 13.8), size: 18, w: 600, align: 'left' }); tag('no AβO-induced rise.', 1082, 470, { a: A(t, 13, 13.8), size: 18, w: 600, align: 'left' }); tag('PKR−/− is lower than WT (*):', 1082, 496, { a: A(t, 13, 13.8), size: 18, w: 500, align: 'left', col: COL.dim }); tag('weaker evidence than', 1082, 522, { a: A(t, 13, 13.8), size: 18, w: 500, align: 'left', col: COL.dim }); tag('TNFR1−/−', 1082, 548, { a: A(t, 13, 13.8), size: 19, w: 500, align: 'left', col: COL.dim });
  },
};
STEPDEF.inflixVivo = {
  apply(S, t) {
    mv(S.n.pkr, 'ko', 0, A(t, .7, 2)); mv(S.n.tnfr, 'bound', 0, A(t, .7, 2)); mv(S.n.tnfr, 'lit', 0, A(t, .7, 2));
    mv(S.n.tnf, 'off', 1, A(t, 3.4, 4.6));
  },
  over(S, t, gt) {
    const T = nodeXY(S, 'tnf');
    const sl = eOut(seg(t, 2.2, 3.6)); pill('infliximab i.p.', T[0] - lerp(260, 168, sl), T[1], { a: A(t, 2.2, 3), sub: '20 µg/day × 7 d' });
    tag('TNF-α neutralized', 716, T[1] + 34, { a: hold(t, 4.4, 5.2, 14.6, 15.4), size: 20, col: COL.dim, align: 'left' });
    barChart({ ...LAY.chart, h: LAY.chart.h + 40 }, { title: 'novel object recognition', unit: 'exploration time (%)', fig: 'Fig. 3A', ymax: 85, ticks: [0, 25, 50, 75], ref: { v: 50, label: '50%' }, n: '7-10', nDots: 7, nUnit: 'mice per group',
      bars: norBars(DATA.NOR_INFLIX, { subs: [['vehicle', ''], ['AβOs', ''], ['AβOs', '+ infliximab']] }) }, { a: A(t, 4.6, 5.4), grow: i => A(t, 5.2 + i * .4, 6.4 + i * .4), sem: A(t, 8.6, 9.2), dots: seg(t, 8.8, 9.6), star: A(t, 9.2, 9.7) });
    txt('memory is preserved when TNF-α is neutralized', LAY.chart.x + 4, LAY.receipt.y + 66, { size: 21, w: 600, a: A(t, 10, 10.8) });
    txt('receptor, kinase or messenger: cut any one', LAY.chart.x + 4, LAY.receipt.y + 110, { size: 20, w: 500, col: COL.dim, a: A(t, 11.4, 12.2) }); txt('and AβOs no longer impair memory', LAY.chart.x + 4, LAY.receipt.y + 138, { size: 20, w: 500, col: COL.dim, a: A(t, 11.4, 12.2) });
  },
};
STEPDEF.gridDone = {
  apply(S, t) {
    diseaseState(S, A(t, .7, 2.4));
    S.grid.big = hold(t, 2.6, 4.2, 10.2, 11.8);
  },
  over(S, t, gt) {
    const X = LAY.chart.x + 4, Y = LAY.chart.y + 60, la = A(t, 11.6, 12.6);
    txt('every tested edge is now', X, Y, { size: 24, w: 600, a: la }); txt('solid or struck', X, Y + 32, { size: 24, w: 600, a: la });
    txt('still open: the authors’ own “?”', X, Y + 84, { size: 21, w: 500, col: COL.dim, a: la }); txt('does IRS-1 inhibition feed memory loss?', X, Y + 112, { size: 21, w: 500, col: COL.dim, a: la });
  },
  top(S, t, gt) {                          // drawn above the glass table
    const g = hold(t, 4, 4.8, 9.8, 10.4);
    txt('† WT 129/SvEv mice showed no AβO-induced rise in IRS-1pSer; PKR−/− sits below WT (Fig. 5B)', 960, 690, { size: 20, w: 500, col: COL.legend, align: 'center', a: g, halo: 9, haloA: 1 });
    txt('‡ thapsigargin i.c.v. impaired memory and also raised eIF2α-P (Fig. S5)', 960, 722, { size: 20, w: 500, col: COL.legend, align: 'center', a: g, halo: 9, haloA: 1 });
    txt('removing a node: necessity', 322, 400, { size: 0, a: 0 });
    const ba = hold(t, 5.6, 6.4, 9.8, 10.4);
    if (ba > 0) { ctx.save(); ctx.globalAlpha *= ba; ctx.strokeStyle = rgb(PC.phos); ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(960 - 786 * .81 - 4, 330 + (38 + 76) * 1.62 - 2, 786 * 1.62 + 8, 76 * 1.62 + 6, 12); ctx.stroke(); ctx.restore();
      txt('these two rows pull the branches apart', 960, 262, { size: 24, w: 600, align: 'center', a: ba }); }
  },
};

/* S14-S20: the manipulation block, rebuilt (2026-11-20 spec)
   Every scene is a change from BASE BOARD (S13's last frame: Fig. 7 layout, chain shifted left). One figure panel at a time, on
   the square frosted panel at the right; each holds only a title, the axis label, bars with SEM and asterisks, one line of n /
   stats and the figure number. No dosage pills, no inline notes, no text blocks. ER only from S18. */
const NOR_CH2 = (P, groups) => ({ ylab: 'exploration time (%)', fig: '', ymax: 85, ticks: [0, 25, 50, 75], note: '',
  bars: norBars(P, {}).map((b, i) => ({ ...b, sub: undefined, gap: 0, lcol: i % 2 ? NOR_COL.new : NOR_COL.old })), groups: groups.map((g, i) => ({ ...g, from: 2 * i, to: 2 * i + 1 })) });
const IRS5D_CH = () => ({ ylab: 'IRS-1pSer636 (a.u.)', fig: '', ymax: 3.4, ticks: [0, 1, 2, 3], note: '',
  bars: [{ ...DATA.IRS_THAPS.bars[0], label: 'vehicle' }, { ...DATA.IRS_THAPS.bars[1], label: 'thapsigargin' }, { ...DATA.IRS_THAPS.bars[2], label: 'thapsigargin', sub: '+ 4-PBA', labDy: 0 }] });
const FIGS = {
  '3A': { title: 'Neutralizing TNF-α preserves memory', D: () => NOR_CH2(DATA.NOR_INFLIX, [{ label: 'vehicle' }, { label: 'AβOs' }, { label: 'AβOs', sub: '+ infliximab' }]), foot: 'Mean ± SEM, n = 7-10 mice per group; *p < 0.05 vs 50%' },
  '3B': { title: 'Without TNFR1, memory is preserved', D: () => NOR_CH2(DATA.NOR_TNFR1, [{ label: 'WT', sub: 'vehicle' }, { label: 'WT', sub: 'AβOs' }, { label: 'TNFR1−/−', sub: 'vehicle' }, { label: 'TNFR1−/−', sub: 'AβOs' }]), foot: 'Mean ± SEM, n = 9-10 mice per group; *p < 0.05 vs 50%' },
  '3G': { title: 'Without PKR, memory is preserved', D: () => NOR_CH2(DATA.NOR_PKR, [{ label: 'WT', sub: 'vehicle' }, { label: 'WT', sub: 'AβOs' }, { label: 'PKR−/−', sub: 'vehicle' }, { label: 'PKR−/−', sub: 'AβOs' }]), foot: 'Mean ± SEM, n = 8-10 mice per group; *p < 0.05 vs 50%' },
  '5D': { title: 'ER stress drives IRS-1pSer', D: IRS5D_CH, foot: 'Mean ± SEM, n = 3 independent experiments; *p < 0.05, ANOVA' },
};
// one panel: o = { a, grow(i), sem, star } (sem / star may be functions of the bar)
const figPanel = (S, key, o) => { const F = FIGS[key]; if ((o.a ?? 1) > .004) sqChart(S, F.title, F.D(), 'Fig. ' + key, { ...o, foot: [F.foot], titleSize: 34, labSize: key === '5D' ? 17 : 20 }, null, 'axis', 0, 1, -6); };
// the frosted panel itself (the board's own panel is hidden in the Fig. 7 layout), at the panel's alpha
const figGlass = S => { const R = panelRect(S); dataGlass(R.x, R.y, R.w, R.h, (S.panelK || 0) * (S.boardA ?? 1), PANEL.r, false); };
const NOR_GROW = (t, t0) => i => A(t, t0 + i * .22, t0 + .9 + i * .22);
const ALL_EDGES = ['abo_tnf', 'tnf_tnfr', 'tnfr_pkr', 'jnk', 'pkr_eif', 'pkr_irs', 'eif_syn', 'syn_mem', 'irs_mem'];
function baseBoard(S, k) {      // back to BASE BOARD (the disease state of Fig. 7), whatever was cut
  diseaseState(S, k);
  for (const n of ['eif', 'irs']) mv(S.n[n], 'off', 0, k);
  mv(S.n.tnfr, 'ko', 0, k); mv(S.n.pkr, 'ko', 0, k);
  for (const e of ALL_EDGES) S.dimEdges[e] = lerp(S.dimEdges[e] || 0, 0, k);
}
const greyNode = (S, n, k) => { mv(S.n[n], 'lit', 0, k); mv(S.n[n], 'off', 1, k); };
function revertDown(S, t, t0, from = 'pkr') {      // the cascade below a cut greys in sequence: PKR-P, eIF2α-P, IRS-1pSer, then synapses and memory come back
  const seq = ['pkr', 'eif', 'irs'], i0 = seq.indexOf(from);
  seq.slice(i0).forEach((n, j) => greyNode(S, n, A(t, t0 + j * .8, t0 + .8 + j * .8)));
  const k = A(t, t0 + (3 - i0) * .8, t0 + (3 - i0) * .8 + 1.0); mv(S.n.syn, 'loss', 0, k); mv(S.n.mem, 'loss', 0, k); mv(S.n.ribo, 'stall', 0, k);
}
const panelSet = (S, a) => { S.vivo.k = 0; S.panelHalf = S.panelHalf ?? 0; S.panelShort = 0; S.panelK = a; };
const drugPill = (s, x, y, a, line) => {      // a white pill, optionally with a connector line to (line[0], line[1])
  if (a <= .004) return;
  fadeLayer(a, () => {      // line and pill fade as one piece
    if (line) { ctx.save(); ctx.strokeStyle = rgb(COL.ink, .75); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(line[0], line[1]); ctx.stroke(); ctx.restore(); }
    pill(s, x, y, { size: 23 });
  });
};
const inflixAt = S => { const T = nodeXY(S, 'tnf'); return [T[0] - 150, T[1]]; };
const salAt = S => { const E = nodeXY(S, 'eif'); return [E[0] + 62, E[1] - 104]; };      // above eIF2α, clear of the PKR-P → eIF2α arrow
function salTop(S, a, la, dy = 0) {      // salubrinal pill above eIF2α, the lock over its right end (as in S12); fades as one piece
  if (a <= .004) return; const [x, y0] = salAt(S), y = y0 + dy;
  fadeLayer(a, () => { const w = pill('salubrinal', x, y, { size: 23 }), h = 23 * 1.7; lockIcon(x + w / 2 + 24, y - h / 2 - 8, 32, la); });
}
const ER_DX = 120;      // S18: the chain glides right so the ER fits left of IRS-1
NODES.er.p1 = [NODES.irs.p1[0] - 240, NODES.irs.p1[1]];      // ER left of IRS-1, same row (it only appears in S18)
const erPills = S => { const R = nodeXY(S, 'er'); return { thaps: [R[0] + 6, R[1] - 132], pba: [R[0] + 6, R[1] + 140], er: R }; };      // thapsigargin above the ER (its line comes down to it), 4-PBA under the ER stress label

STEPDEF.s14Inflix = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)      // cut the messenger
  apply(S, t) {
    S.panelHalf = 0; panelSet(S, A(t, 6.6, 7.4));
    { const k = A(t, 1.2, 2.2); mv(S.n.tnf, 'off', 1, k); mv(S.n.tnf, 'up', 0, k); }
    { const k = A(t, 2.2, 3.0); mv(S.n.tnfr, 'lit', 0, k); mv(S.n.tnfr, 'bound', 0, k); mv(S.n.tnfr, 'off', 1, k); }
    revertDown(S, t, 3.0);
  },
  over(S, t, gt) {
    figGlass(S);
    const P = inflixAt(S); drugPill('infliximab', P[0], P[1], A(t, .3, 1.1));
    figPanel(S, '3A', { a: A(t, 7.0, 7.8), grow: NOR_GROW(t, 7.6), sem: A(t, 9.4, 10.0), star: A(t, 9.8, 10.3) });
  },
};
STEPDEF.s15Tnfr = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)      // cut the receptor
  apply(S, t) {
    panelSet(S, Math.max(1 - A(t, 0, .8), A(t, 7.4, 8.2)));
    baseBoard(S, A(t, .6, 2.0));
    mv(S.n.tnfr, 'ko', 1, A(t, 2.4, 3.6));
    { const k = A(t, 3.0, 3.8); S.dimEdges.tnfr_pkr = k; S.dimEdges.jnk = k; }      // nothing leaves an empty receptor
    revertDown(S, t, 3.8);
  },
  over(S, t, gt) {
    figGlass(S);
    const P = inflixAt(S); drugPill('infliximab', P[0], P[1], 1 - A(t, 0, .8));
    figPanel(S, '3A', { a: 1 - A(t, 0, .8) });
    figPanel(S, '3B', { a: A(t, 7.8, 8.6), grow: NOR_GROW(t, 8.4), sem: A(t, 10.4, 11.0), star: A(t, 10.8, 11.3) });
  },
};
STEPDEF.s16Pkr = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)      // cut the kinase
  apply(S, t) {
    panelSet(S, Math.max(1 - A(t, 0, .8), A(t, 6.6, 7.4)));
    baseBoard(S, A(t, .6, 2.0));
    mv(S.n.pkr, 'ko', 1, A(t, 2.4, 3.6)); mv(S.n.pkr, 'lit', 0, A(t, 2.4, 3.6));      // gone: no PKR-P
    { const k = A(t, 2.8, 3.8); S.dimEdges.pkr_eif = k; S.dimEdges.pkr_irs = k; }      // both arrows out of the empty circle grey out
    greyNode(S, 'eif', A(t, 3.8, 4.6));
    { const k = A(t, 4.6, 5.6); mv(S.n.syn, 'loss', 0, k); mv(S.n.mem, 'loss', 0, k); mv(S.n.ribo, 'stall', 0, k); }
    mv(S.n.irs, 'lit', .4, A(t, 5.0, 6.0));      // IRS-1 keeps ~40% of its gold: reduced, not blocked (Fig. 5B)
  },
  over(S, t, gt) {
    figGlass(S);
    figPanel(S, '3B', { a: 1 - A(t, 0, .8) });
    figPanel(S, '3G', { a: A(t, 7.0, 7.8), grow: NOR_GROW(t, 7.6), sem: A(t, 9.4, 10.0), star: A(t, 9.8, 10.3) });
  },
};
STEPDEF.s17Sal = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)      // force the kinase branch
  apply(S, t) {
    panelSet(S, 1 - A(t, 0, .8));
    baseBoard(S, A(t, .6, 1.8));
    { const k = A(t, 1.8, 3.0);      // then everything upstream goes grey, synapses and memory intact
      for (const n of ['abo', 'tnf', 'tnfr', 'pkr', 'irs', 'eif']) greyNode(S, n, k);
      mv(S.n.tnf, 'up', 0, k); mv(S.n.tnfr, 'bound', 0, k); mv(S.n.syn, 'loss', 0, k); mv(S.n.mem, 'loss', 0, k); mv(S.n.ribo, 'stall', 0, k);
      for (const e of ['abo_tnf', 'tnf_tnfr', 'tnfr_pkr', 'jnk', 'pkr_eif', 'pkr_irs', 'eif_syn', 'syn_mem']) S.dimEdges[e] = lerp(S.dimEdges[e] || 0, 1, k);
      S.n.er.lit = 0; }
    { const k = A(t, 4.8, 5.6); mv(S.n.eif, 'off', 0, k); mv(S.n.eif, 'lit', 1, k); }      // salubrinal: eIF2α-P
    S.dimEdges.eif_syn = 1 - A(t, 5.8, 6.4);                                                   // eIF2α-P → synapses goes solid
    mv(S.n.syn, 'loss', 1, A(t, 6.6, 7.6));                                                    // synapses dissociate: synapse loss
    { const k = A(t, 7.8, 8.4); S.dimEdges.syn_mem = 1 - k; mv(S.e.syn_mem, 'solid', 1, k); }  // synapse loss → memory goes solid
    mv(S.n.mem, 'loss', 1, A(t, 8.2, 9.0));
    { const k = A(t, 9.2, 10.2); S.eifIrsA = 1; mv(S.e.eif_irs, 'show', 1, k); mv(S.e.eif_irs, 'solid', 1, k); mv(S.e.eif_irs, 'strike', 1, k); }      // the struck arrow eIF2α-P → IRS-1
    S.n.irs.s = 1 + .14 * Math.sin(Math.PI * seg(t, 10.4, 11.1));                              // IRS-1 pulses once and stays grey
  },
  over(S, t, gt) {
    figGlass(S);
    figPanel(S, '3G', { a: 1 - A(t, 0, .8) });
    salTop(S, A(t, 4.0, 4.6), A(t, 4.6, 5.0), -26 * (1 - eOut(seg(t, 4.0, 4.8))));      // drops in from above, then the lock
  },
};
STEPDEF.s18Thaps = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)      // force the other input (continues from S17)
  apply(S, t) {
    S.n.irs.s = 1;
    mv(S, 'f7dx', F7_DX + ER_DX, A(t, 0, 1.4)); S.panelHalf = .5; panelSet(S, A(t, 6.0, 6.8));      // room for the ER on the left; a narrower panel keeps the gutter
    S.erA = 1; mv(S.n.er, 'a', 1, A(t, .6, 1.6)); mv(S.n.er, 'lit', 1, A(t, 3.0, 3.8));            // ER, then ER stress
    { const k = A(t, 4.0, 4.8); mv(S.e.er_irs, 'show', 1, k); mv(S.e.er_irs, 'solid', 1, k); }
    { const k = A(t, 4.8, 5.6); mv(S.n.irs, 'off', 0, k); mv(S.n.irs, 'lit', 1, k); }
    S.n.irs.lit = lerp(S.n.irs.lit, .37, A(t, 11.0, 12.0));      // 4-PBA: back to partial gold, as its bar sits above vehicle
  },
  over(S, t, gt) {
    figGlass(S);
    salTop(S, 1 - A(t, 0, .8), 1);
    const Q = erPills(S), er = [Q.er[0], Q.er[1] - 44];
    drugPill('thapsigargin', Q.thaps[0], Q.thaps[1], A(t, 2.0, 2.8), er);
    drugPill('4-PBA', Q.pba[0], Q.pba[1], A(t, 9.8, 10.6));
    figPanel(S, '5D', { a: A(t, 6.4, 7.2), grow: i => i < 2 ? A(t, 7.0 + i * .5, 8.1 + i * .5) : A(t, 10.6, 11.8), sem: i => i < 2 ? A(t, 8.8, 9.4) : A(t, 11.9, 12.4), star: A(t, 9.2, 9.7), lab: i => i < 2 ? 1 : A(t, 10.2, 10.8) });
  },
};
/* S19: the table, on a frosted glass panel over the pathway (the scene stays behind it, blurred). TBL_OPT: three table styles
   (?tbl=1..3) for Felix to pick from. Columns: row label, condition, synapse loss / memory, IRS-1 inhibition. */
const TBL_OPTS = {
  1: { style: 'rule', w: 1300, rowH: 70, head: 66, pad: 54 },      // ruled: a line under the header and between rows
  2: { style: 'grid', w: 1300, rowH: 72, head: 68, pad: 54 },      // grid: every cell boxed by thin lines
  3: { style: 'band', w: 1300, rowH: 70, head: 66, pad: 54 },      // banded: every other row a faint band, no lines
};
const TBL = TBL_OPTS[new URLSearchParams(location.search).get('tbl')] || TBL_OPTS[2];      // Felix's pick: T2 grid
TBL.cols = { lab: 52, cond: 330, d1: 500 }; TBL.cols.cw = (TBL.w - 30 - TBL.cols.d1) / 2; TBL.cols.d2 = TBL.cols.d1 + TBL.cols.cw; TBL.h = TBL.head + 4 * TBL.rowH + 2 * TBL.pad;      // the two result columns are the same width
const TBL_ROWS = [['remove TNFR1', 'TNFR1−/−', ['blocked', 'Fig. 3B-F', 0], ['blocked', 'Fig. 5A', 0]], ['remove PKR', 'PKR−/−', ['blocked', 'Fig. 3G-I', 0], ['reduced', 'Fig. 5B', 1]],
  ['force eIF2α-P', 'salubrinal', ['occurs', 'Fig. 4A-H', 1], ['does not occur', 'Fig. 5E-H', 0]], ['force ER stress', 'thapsigargin', ['occurs', 'Fig. S5C-D', 1], ['occurs', 'Fig. 5C-D', 1]]];
const TBL_T = { panel: [.7, 1.7], frame: [1.9, 2.7], rows: [3.1, 4.3, 5.5, 6.7] };      // frame: grid, header and the faint row labels all together; then the rows fill
const tblRect = () => ({ x: W / 2 - TBL.w / 2, y: H / 2 - TBL.h / 2, w: TBL.w, h: TBL.h });
function resultTable(a, fill = [1, 1, 1, 1], fr = 1) {      // fr: the grid, header and faint row labels
  if (a <= .004) return;
  const R = tblRect(), C = TBL.cols, x0 = R.x + 30, x1 = R.x + R.w - 30, y0 = R.y + TBL.pad, grey = mix(COL.dim, COL.text, .15), rowY = i => y0 + TBL.head + TBL.rowH * i;
  ctx.save(); ctx.globalAlpha *= a;
  const line = (xa, ya, xb, yb, al) => claySuspend(() => { ctx.save(); ctx.globalAlpha *= al * fr; ctx.strokeStyle = rgb(COL.ink); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.restore(); });
  if (TBL.style === 'rule') { line(x0, rowY(0), x1, rowY(0), .45); for (let i = 1; i < 4; i++) line(x0, rowY(i), x1, rowY(i), .16); }
  if (TBL.style === 'grid') { line(x0, y0, x1, y0, .22); for (let i = 0; i <= 4; i++) line(x0, rowY(i), x1, rowY(i), i ? .22 : .4);
    for (const dx of [0, C.d1, C.d2, R.w - 30]) line(R.x + (dx || 30), y0, R.x + (dx || 30), rowY(4), .22); }
  if (TBL.style === 'band') claySuspend(() => { for (const i of [0, 2]) { ctx.save(); ctx.globalAlpha *= fr; ctx.fillStyle = 'rgba(255,255,255,.055)'; ctx.beginPath(); ctx.roundRect(x0, rowY(i) + 3, x1 - x0, TBL.rowH - 6, 8); ctx.fill(); ctx.restore(); } });
  [[C.d1, 'synapse loss / memory'], [C.d2, 'IRS-1 inhibition']].forEach(([dx, s]) => txt(s, R.x + dx + 22, y0 + TBL.head / 2 + 2, { size: 27, w: 600, base: 'middle', a: fr }));
  TBL_ROWS.forEach(([lab, cond, r1, r2], i) => {
    const f = fill[i], y = rowY(i) + TBL.rowH / 2 + 1;
    txt(lab, R.x + C.lab, y, { size: 28, w: 600, base: 'middle', a: fr * lerp(.3, 1, f) });
    txt(cond, R.x + C.cond, y, { size: 23, w: 500, col: COL.dim, base: 'middle', a: f });
    [[C.d1, r1], [C.d2, r2]].forEach(([dx, [w, fig, gold]]) => {
      txt(w, R.x + dx + 22, y, { size: 28, w: 600, col: gold ? COL.phos : grey, base: 'middle', a: f });
      txt(fig, R.x + dx + C.cw - 22, y + 1, { size: 22, w: 500, col: COL.dim, align: 'right', base: 'middle', a: f });
    });
  });
  ctx.restore();
}
STEPDEF.s19Table = {
  noXfade: true,      // opens on the previous clip's last frame exactly (a dissolve doubled the board while it moved)
  apply(S, t) { panelSet(S, 1 - A(t, .3, 1.0)); },      // the pathway stays; the table sits on frosted glass over it
  over(S, t, gt) {
    figGlass(S);
    { const Q = erPills(S), o = 1 - A(t, 0, .5); figPanel(S, '5D', { a: o }); drugPill('thapsigargin', Q.thaps[0], Q.thaps[1], o, [Q.er[0], Q.er[1] - 44]); drugPill('4-PBA', Q.pba[0], Q.pba[1], o); }      // the chart goes before its glass does
    const R = tblRect(); dataGlass(R.x, R.y, R.w, R.h, A(t, ...TBL_T.panel), 18);
    resultTable(1, TBL_T.rows.map(r => A(t, r, r + .7)), A(t, ...TBL_T.frame));
  },
};
STEPDEF.s20Close = {      // the table fades out; the empty frosted panel stays (Felix: no closing lines)
  noXfade: true,
  apply(S, t) { },
  over(S, t, gt) { const R = tblRect(); dataGlass(R.x, R.y, R.w, R.h, 1, 18); resultTable(1 - A(t, .2, 1.2)); },
};
STEPDEF.controlHold = { apply() {}, over(S, t, gt) { STEPDEF.control.over(S, 18.6, gt); } };      // split-screen variant only: fills S6B / S6C's slots
