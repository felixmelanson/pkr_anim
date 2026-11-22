'use strict';
// The pathway board (scenes 5-13). One object in two layouts: lay 0 = inside the neuron (membrane across the top,
// molecules as clay shapes); lay 1 = the arrangement of the paper's Figure 7. Every node and edge interpolates between
// the two, so the morph in scene 9 is the same object re-laid-out. Edge states carry the solid / dashed / struck rule.
const MEMB_Y = 212;                                // lower than before: more room outside the neuron, under the title
/* The live layout (lay 0) is authored in the p0 coordinates below and drawn BK times larger, scaled about the left end of
   the membrane line: icons, labels, bilayer and offsets all grow together. The Fig. 7 layout (p1) is in final screen
   coordinates and spans the full height of the band, like the paper's portrait figure. */
const BK = 1.3, BKX = 1.22, BKY = 1.4, BX0 = 60;      // BK: size of everything; BKX / BKY: spacing of the nodes (x, and y below the membrane): the stage is 1080 tall, the panel on the right takes the width
const BK7 = 1.15;                                  // furniture scale in the Fig. 7 layout (labels, offsets): it no longer shrinks
const bk = S => lerp(BK, BK7, S.lay);                 // local scale of board furniture at the current layout
const NODES = {
  //        live position   Fig. 7 position  live scale / Fig. 7 scale, rim radius (live), label side
  abo:  { p0: [372, 226],  p1: [740, 80], s0: 1.0, s1: 1.15, r: 38 },
  tnf:  { p0: [640, 207],  p1: [740, 228], s0: .95, s1: 1.0, r: 33 },
  tnfr: { p0: [640, 311],  p1: [740, 395], s0: 1.2, s1: 0.95, r: 54 },
  ir:   { p0: [204, 311],  p1: [236, 330], s0: 1.0, s1: .5, r: 50 },
  pkr:  { p0: [640, 492],  p1: [740, 555], s0: 1.32, s1: 1.3, r: 48 },
  irs:  { p0: [392, 620],  p1: [480, 700], s0: 1.3, s1: 1.25, r: 50 },
  eif:  { p0: [704, 620],  p1: [1000, 700], s0: 1.3, s1: 1.3, r: 48 },
  syn:  { p0: [872, 620],  p1: [1000, 872], s0: .98, s1: 0.9, r: 46 },
  mem:  { p0: [1030, 620], p1: [1000, 995], s0: .96, s1: 0.7, r: 60 },
  er:   { p0: [152, 620],  p1: [200, 840], s0: 1.0, s1: 1.1, r: 54 },
  jnk:  { p0: [470, 446],  p1: [480, 540], s0: .85, s1: 0.9, r: 30 },
};
const NAME = {       // [resting name, active name, sub-line when active]
  abo: ['AβOs', 'AβOs'], tnf: ['TNF-α', 'TNF-α ↑'], tnfr: ['TNFR1', 'TNFR1'], ir: ['insulin receptor', 'insulin receptor'],
  pkr: ['PKR', 'PKR-P'], irs: ['IRS-1', 'IRS-1pSer'], eif: ['eIF2α', 'eIF2α-P'],      // (phospho-site sub-lines pThr451 / pSer636 · inhibitory / pSer51 removed to declutter: they are in the chart titles and Fig. 7)
  syn: ['synapses', 'synapse loss', '(↓ Syp, ↓ PSD-95)'], mem: ['memory', 'memory impairment'], er: ['ER', 'ER stress'], jnk: ['pJNK IKK', 'pJNK IKK'],
};
const BSHIFT = -66;                                // the whole live layout sits further left: the data panel gets the room
const liveXY = p => [BX0 + BSHIFT + (p[0] - BX0) * BKX, MEMB_Y + (p[1] - 300) * (p[1] > 300 ? BKY : BK)];      // p0 was authored with the membrane at y = 300
const nodeXY = (S, k) => { const N = NODES[k], u = S.lay, a = liveXY(N.p0); return [lerp(a[0], N.p1[0] + (S.f7dx || 0), u), lerp(a[1], N.p1[1], u) + (S.n[k]?.dy || 0)]; };      // S.f7dx: a sideways shift of the Fig. 7 layout (end of scene 13)      // n.dy: a temporary vertical offset (TNF-α starts raised in scene 8 and descends onto the receptor); edges and labels follow it
const nodeS = (S, k) => lerp(NODES[k].s0 * BK, NODES[k].s1, S.lay);
const nodeR = (S, k) => NODES[k].r * nodeS(S, k) / NODES[k].s0 * lerp(1, 1.25, S.lay) + lerp(0, 4, S.lay);

/* The neuron's interior. Membrane = a bilayer whose outer face passes through (AX, MEMB_OUT) with the cytoplasm below.
   S.cam.Rc * S.cam.z is the radius (px) of the soma the scene-5 camera is flying into: the bilayer is drawn on that circle,
   so it starts as the cell's own curved edge (same place, same gold as the phospho-PKR-lit neuron, a solid band as thick as
   the cell's rim) and flattens as the zoom continues; S.flat finishes the job exactly. S.beads resolves the band into lipids. */
const MEMB = { gap: 22 * BK, step: 12.5 * BK, bead: 12.5 * BK * .52 }, MEMB_OUT = MEMB_Y - MEMB.bead, MEMB_TH = MEMB.gap + 2 * MEMB.bead;
// lipid colours: PALETTES[theme].board (theme.js; editable on the elements page as 'Membrane & cytoplasm')
const MEMB_PAL = { get body() { return PAL().board.head; }, get rim() { return mix(PAL().board.head, [0, 0, 0], .4); }, get tail() { return PAL().board.tail; } };
const MEMB_BAND = { a: 0, col: L => [92, 40, 6] };      // optional ribbon under the lipids (off)      // membrane ribbon: colour and strength
function litNeuron() { const p = palMix(TP.neuron, CORAL, 1); return { rim: p.rim, body: mix(p.body, p.rim, UI.cellMix * .5) }; }
function cytoColor(S) { return PAL().board.cyto; }      // the cytoplasm: matched to the textured lit neuron so the push-in hands over without a colour jump
function cytoColor_old(S) { const L = litNeuron().body, settled = THEME.light ? mix(L, [255, 255, 255], .2) : mix(L, [0, 0, 0], .3); return mix(L, settled, S.cyt ?? 1); }
function boardBackdrop(S) {
  const F = LAY.field, lay = S.lay, a = 1 - lay; if (a <= .004) return;
  const AX = S.cam.ax ?? FC.x, flat = S.flat ?? 1, R0 = (S.cam.Rc || 20) * S.cam.z, R = flat >= 1 || R0 > 4e6 ? Infinity : R0 / Math.pow(1 - flat, 2);
  const beads = S.beads ?? 1, L = { rim: PAL().board.memb }, mid = MEMB_TH / 2;      // the membrane edge the cell's rim hands over to
  // y of a circle of radius r (concentric with the membrane) below its apex, at horizontal offset dx
  const sag = (dx, r) => r === Infinity ? 0 : Math.abs(dx) >= r ? 1e5 : dx * dx / (r + Math.sqrt(r * r - dx * dx));
  claySuspend(() => {
    ctx.save(); ctx.globalAlpha *= a; fieldClip(1); ctx.clip();
    // cytoplasm
    ctx.fillStyle = rgb(cytoColor(S));
    if (R < 5000) { ctx.beginPath(); ctx.arc(AX, MEMB_OUT + R, Math.max(1, R - mid), 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(-40, BAND.y + BAND.h + 10); for (let x = -40; x <= W + 40; x += 40) ctx.lineTo(x, MEMB_OUT + mid + sag(x - AX, R - mid)); ctx.lineTo(W + 40, BAND.y + BAND.h + 10); ctx.closePath(); ctx.fill(); }
    // the cell's own rim, until the lipids take over
    if (beads < 1) {
      // the rim stays solid until the lipids are fully in, then lets go: no see-through dip mid-handover
      ctx.save(); ctx.globalAlpha *= 1 - seg(beads, .5, 1); ctx.strokeStyle = rgb(L.rim); ctx.lineWidth = MEMB_TH; ctx.beginPath();
      if (R < 5000) ctx.arc(AX, MEMB_OUT + R, Math.max(1, R - mid), 0, TAU); else for (let x = -40; x <= W + 40; x += 40) ctx.lineTo(x, MEMB_OUT + mid + sag(x - AX, R - mid));
      ctx.stroke(); ctx.restore();
    }
    // the membrane as a ribbon of its own colour, so the lipids do not sit straight on the black / cytoplasm split
    if (beads > .004 && MEMB_BAND.a > 0) {
      ctx.save(); ctx.globalAlpha *= beads * MEMB_BAND.a; ctx.strokeStyle = rgb(MEMB_BAND.col(L)); ctx.lineWidth = MEMB_TH; ctx.beginPath();
      if (R < 5000) ctx.arc(AX, MEMB_OUT + R, Math.max(1, R - mid), 0, TAU); else for (let x = -40; x <= W + 40; x += 40) ctx.lineTo(x, MEMB_OUT + mid + sag(x - AX, R - mid));
      ctx.stroke(); ctx.restore();
    }
    // lipids: head groups on both leaflets, acyl tails between, laid along the arc
    if (beads > .004) {
      const pal = MEMB_PAL, st = MEMB.step,
       br = MEMB.bead, n = R === Infinity ? Math.ceil(W / st) : Math.min(Math.ceil(W / st), Math.floor(Math.PI * R / st));
      ctx.save(); ctx.globalAlpha *= seg(beads, 0, .4);
      for (let i = -n; i <= n; i++) {
        const s = (i + .5) * st, ph = R === Infinity ? 0 : s / R, sn = Math.sin(ph), cs = Math.cos(ph);
        const at = d => R === Infinity ? [AX + s, MEMB_OUT + d] : [AX + (R - d) * sn, MEMB_OUT + R - (R - d) * cs];     // d = depth below the outer face
        const o = at(br), q = at(br + MEMB.gap); if (o[0] < -20 && q[0] < -20 || o[0] > W + 20 && q[0] > W + 20 || Math.min(o[1], q[1]) > BAND.y + BAND.h + 20) continue;
        ctx.strokeStyle = rgb(pal.tail, .5); ctx.lineWidth = 1.5; ctx.beginPath();
        const t0 = at(br + 4), t1 = at(br + MEMB.gap / 2 - 1), t2 = at(br + MEMB.gap / 2 + 1), t3 = at(br + MEMB.gap - 4);
        for (const e of [-1.4, 1.4]) { ctx.moveTo(t0[0] + e * cs, t0[1] + e * sn); ctx.lineTo(t1[0] + e * .6 * cs, t1[1] + e * .6 * sn); ctx.moveTo(t3[0] + e * cs, t3[1] + e * sn); ctx.lineTo(t2[0] + e * .6 * cs, t2[1] + e * .6 * sn); }
        ctx.stroke();
        for (const b of [o, q]) { ctx.beginPath(); ctx.arc(b[0], b[1], br, 0, TAU); ctx.fillStyle = rgb(pal.body); ctx.fill(); ctx.strokeStyle = rgb(pal.rim, .8); ctx.lineWidth = .9; ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.restore();
  });
}
function nodeLabel(S, k, x, y, n) {
  const lay = S.lay, [n0, n1, sub] = NAME[k], act = k === 'syn' || k === 'mem' ? (n.loss || 0) : k === 'tnf' ? (n.up || 0) : (n.lit || 0);
  const la = (n.a ?? 1) * (n.lab ?? 1); if (la <= .004) return;
  const actS = ease(seg(act, .08, .16));      // switches early and fast: a part-lit node (4-PBA leaves .25-.5) never shows two names at once        // the name switches once, it does not ghost at half-lit
  const K = bk(S), col = mix(COL.text, COL.dim, (n.off || 0) * .8), size = lerp(25, 23, lay) * K, haloCol = COL.bg;      // every label gets the dark outline (TNFR1, insulin receptor, …) so they read on the cytoplasm
  // live layout: label under the icon (beside it for the membrane row); Fig. 7 layout: label right of the small icon
  const side = { abo: [0, -1], tnf: [1, 0], tnfr: [1, 0], ir: [1, 1], pkr: [1, 0], er: [0, 1], jnk: [0, -1] }[k] || [0, 1], r = NODES[k].r * (nodeS(S, k) / NODES[k].s0);
  let lx0 = x + side[0] * (r + 14 * K), ly0 = y + side[1] * (r + 26 * K) + (side[1] ? 0 : 2), al0 = side[0] < 0 ? 'right' : side[0] > 0 ? 'left' : 'center';
  if (k === 'tnfr') { lx0 = x + 58 * K; ly0 = y + 50 * K; } if (k === 'ir') { lx0 = x; ly0 = y - 126 * K; al0 = 'center'; }      // TNFR1 / PKR / TNF-α labels share one left edge; insulin receptor and AβOs are labelled on top if (k === 'pkr') { lx0 = x + 58 * K; ly0 = y + 14 * K; }
  if (k === 'abo') { lx0 = x; ly0 = y - 74; al0 = 'center'; } if (k === 'tnf') { lx0 = x + 58 * K; ly0 = y - 6 * K; } if (k === 'mem') { lx0 = x + 14; ly0 = y; al0 = 'center'; } if (k === 'er' || k === 'irs' || k === 'eif' || k === 'syn') ly0 = y + 100;      // the bottom row shares one label height      // memory: no icon, the word sits in its place
  const f7 = { abo: [38, 0, 'left'], tnf: [36, 0, 'left'], tnfr: [40, 0, 'left'], pkr: [52, 0, 'left'], irs: [0, 46, 'center'], eif: [58, -4, 'left'], syn: [32, -6, 'left'], mem: [0, 0, 'center'], er: [0, 50, 'center'], jnk: [0, -44, 'center'], ir: [0, 40, 'center'] }[k];
  const lx = lerp(lx0, x + f7[0] * 1.35, lay), ly = lerp(ly0, y + f7[1] * 1.35, lay), align = lay < .5 ? al0 : f7[2], sw = lay < .5 ? 1 - seg(lay, .25, .5) : seg(lay, .5, .75);
  const two = (lay < .5 && (k === 'syn' || k === 'ir')) || k === 'mem' || k === 'jnk';      // two short lines (synapses; "memory" / "impairment")           // bottom-right nodes: two short lines so neighbours do not collide
  const draw = (s, a) => {
    if (a <= .004) return;
    if (two && s.includes(' ')) { const [w1, w2] = s.split(' '); txt(w1, lx, ly, { size, w: 600, col, align, base: 'middle', a: a * la * sw, halo: 6, haloCol }); txt(w2, lx, ly + 26 * K, { size, w: 600, col, align, base: 'middle', a: a * la * sw, halo: 6, haloCol }); }
    else txt(s, lx, ly, { size, w: 600, col, align, base: 'middle', a: a * la * sw, halo: 6, haloCol });
  };
  draw(n0, n0 === n1 ? 1 : 1 - actS); if (n0 !== n1) draw(n1, actS);
  if (sub && actS > 0 && !(two)) txt(sub, lx, ly + 25 * K, { size: 17 * K, w: 500, haloCol, col: lay < .5 ? mix(COL.dim, COL.text, .8) : COL.dim, align, base: 'middle', a: actS * la * sw * (1 - lay * (k === 'syn' ? 0 : 1)), halo: 5 });
}
function drawNode(S, k, gt) {
  const n = S.n[k]; if (!n || n.a <= .004) return;
  const [x, y] = nodeXY(S, k), s = nodeS(S, k) * (n.s ?? 1);
  fadeLayer(n.a, () => {      // the molecule fades in as one picture: no see-through domains, no texture pop at full strength
  if (n.ko > 0) { ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= n.ko; mGONE(NODES[k].r * nodeS(S, k) / NODES[k].s0 * .9); ctx.restore(); }
  if ((n.ko || 0) < 1) {
    ctx.save(); ctx.translate(x, y + (k === 'tnfr' || k === 'ir' ? MEMB.gap / 2 * (1 - S.lay) : 0)); ctx.scale(s, s); ctx.globalAlpha *= 1 - (n.ko || 0);
    if (n.bob) ctx.translate(0, Math.sin(gt * 1.1 + x) * 1.5);
    if (k !== 'mem') texEl(MOL_EL[k] || k, ctx, () => MOL[k](n, gt), 0, 0, 95);      // memory is just its word, no icon. Each molecule has its own look (elements page)
    ctx.restore();
  }
  });
  nodeLabel(S, k, x, y, n);
  if (n.ko > 0) txt(k === 'tnfr' ? 'TNFR1−/−' : 'PKR−/−', x - 48, y + 3, { size: 21, w: 700, col: COL.dim, align: 'right', base: 'middle', a: n.ko * n.a, halo: 6 });
}
// edge list: [key, from, to, options(S)] ; anchors come from the node rims so they follow the layout morph
const EDGES = [
  ['abo_tnf', 'abo', 'tnf', S => ({ bend: lerp(-26 * BK, 0, S.lay) })],
  ['abo_dir', 'abo', 'pkr', S => ({ a: S.dirA ?? 1, bend: 20 * BK, strikeAt: .5 })],
  ['tnf_tnfr', 'tnf', 'tnfr', S => ({ a: seg(S.lay, .5, 1) })],
  ['tnfr_pkr', 'tnfr', 'pkr', S => ({})],
  ['pkr_eif', 'pkr', 'eif', S => ({})],
  ['pkr_irs', 'pkr', 'irs', S => ({ label: '†', labelSize: 24, labelOff: -16, labelCol: COL.text, labelA: S.dagger || 0 })],
  ['eif_syn', 'eif', 'syn', S => ({})],
  ['syn_mem', 'syn', 'mem', S => ({})],
  ['eif_irs', 'eif', 'irs', S => ({ strikeAt: .5, a: S.eifIrsA ?? 1 })],
  ['er_irs', 'er', 'irs', S => ({ a: S.erA ?? 1 })],
  ['er_eif', 'er', 'eif', S => ({ thin: true, bend: lerp(150 * BK, 130, S.lay), a: S.erA ?? 1 })],
  ['irs_mem', 'irs', 'mem', S => ({ labelA: S.irsQ ?? 1, bend: lerp(340, 0, S.lay), label: '?', labelSize: 42, labelCol: COL.text, labelOff: lerp(56, 40, S.lay), labelAt: lerp(IRS_Q.u, .5, S.lay) })],
  ['jnk', 'tnfr', 'irs', S => ({ bend: lerp(60 * BK, 96, S.lay), thin: true })],
];
const IRS_Q = { u: .5 };      // where along the IRS-1 → memory arc the "?" sits in the live layout (set each frame so it lines up with the slashes on the eIF2α-P → IRS-1 arrow)
const EDGE_TRIM = {
  er_irs: { live: [0, 46], fin: [0, 22] }, eif_irs: { live: [0, 38], fin: [0, 0] },
  pkr_irs: { live: [0, 38], fin: [0, 24] }, pkr_eif: { live: [0, 0], fin: [0, 24] }, tnf_tnfr: { live: [0, 0], fin: [0, 38] },
  eif_syn: { live: [0, 0], fin: [-20, 8] }, syn_mem: { live: [-16, 0], fin: [-22, -14] },
};
function drawEdges(S, gt) {
  { const T = EDGE_TRIM.eif_irs, [e0, e1] = between(nodeXY(S, 'eif'), nodeR(S, 'eif'), nodeXY(S, 'irs'), nodeR(S, 'irs') + lerp(T.live[1], T.fin[1], S.lay)); IRS_Q.x = (e0[0] + e1[0]) / 2; }      // x of the slashes on the eIF2α-P → IRS-1 arrow
  for (const [key, a, b, of] of EDGES) {
    const st = S.e[key]; if (!st || ((st.show || 0) <= .004 && (st.solid || 0) <= .004)) continue;
    const na = S.n[a], nb = S.n[b], o = of(S);
    let pa = nodeXY(S, a), pb = nodeXY(S, b), ra = nodeR(S, a), rb = nodeR(S, b);
    if (S.lay < 1) {                 // live-layout anchor tweaks: receptors hang through the membrane
      const u = (1 - S.lay) * BK;
      if (a === 'tnfr') pa = [pa[0], pa[1] + 24 * u]; if (b === 'tnfr') pb = [pb[0], pb[1] - 40 * u];
      if (key === 'irs_mem') { pa = [pa[0] + 78 * u, pa[1] + 44 * u]; ra = lerp(ra, 4, 1 - S.lay); pb = [pb[0] + 4 * u, pb[1] + 44 * u]; rb = lerp(rb, 4, 1 - S.lay); }      // same height both ends: a symmetric arc
      if (key === 'tnfr_pkr') { pa = [pa[0], pa[1] - 10 * u]; pb = [pb[0], pb[1] - 14 * u]; }
      if (key === 'abo_tnf') { pa = [pa[0] - 13 * u, pa[1]]; pb = [pb[0] - 13 * u, pb[1]]; }
      if (key === 'abo_dir') { pa = [pa[0] - 12 * u, pa[1] + 8 * u]; pb = [pb[0] - 12 * u, pb[1] + 8 * u]; }      // the struck AβO → PKR arrow: a touch left and down
      if (key === 'pkr_eif') { pb = [pb[0] + 30 * u, pb[1] - 4 * u]; }
      if (key === 'eif_irs') { pa = [pa[0], pa[1] + 0 * u]; }
    }
    // end trims: + shortens the arrow at that end (so the head clears the icon / its P badge), - lengthens it. [live layout, Fig. 7 layout]
    const TR = EDGE_TRIM[key];
    if (TR) { ra += lerp(TR.live[0], TR.fin[0], S.lay); rb += lerp(TR.live[1], TR.fin[1], S.lay); }
    if (S.lay > 0) { if (key === 'abo_tnf') { pa = [pa[0], pa[1] - 14 * S.lay]; pb = [pb[0], pb[1] - 14 * S.lay]; } if (key === 'tnf_tnfr') pa = [pa[0], pa[1] - 10 * S.lay]; }
    if (key === 'irs_mem' && S.lay > 0) { pb = [pb[0] - 88 * S.lay, pb[1] + 26 * S.lay - 12 * S.lay]; pa = [pa[0], pa[1] - 12 * S.lay]; rb = lerp(rb, 6, S.lay); }      // final layout: ends just before, and points at, the word "impairment"
    const [p0, p1] = between(pa, ra, pb, rb);
    if (key === 'irs_mem') { const g = edgeGeom(p0, p1, o.bend || 0); let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; (edgePt(g, m)[0] < IRS_Q.x ? lo = m : hi = m); } IRS_Q.u = (lo + hi) / 2; o.labelAt = lerp(IRS_Q.u, .5, S.lay); }
    const active = (na.lit || na.up || 0) > .5 && !(na.off > .5);
    drawEdge(p0, p1, st, { gt, w: lerp(BK * .96, 1.3, S.lay), pulse: (st.pulse ?? 1) * (active ? 1 : 0), ph: key.length * .13, ...o, a: (o.a ?? 1) * Math.min(1, (na.a ?? 1) + .0) * (1 - (S.dimEdges?.[key] || 0) * .65) });
  }
}
function drawBoard(S, gt) {
  const a = S.boardA; if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a;
  boardBackdrop(S);
  const K = bk(S), cyt = cytoColor(S);
  // the molecules arrive once the membrane has settled; drawn at full strength and faded as ONE picture (no see-through overlaps)
  fadeLayer(S.nodesA ?? 1, () => {
  ctx.save(); fieldClip(2); ctx.clip();
  // insulin signalling: receptor to IRS-1, a plain connector that greys when IRS-1 carries the inhibitory serine mark
  if (S.n.ir.a > .004 && S.n.irs.a > .004 && S.lay < 1) {
    // dead: the stream greys and halts. Scene 11 drives it itself (ir.dead, after IRS-1 has gone gold); elsewhere it follows IRS-1.
    // ir.ph: the stream's phase, integrated by scene 11 so the dots slow to a stop instead of jumping; ir.live = 0 while it does.
    const ir = S.n.ir, dead = Math.min(S.n.irs.lit || 0, ir.dead ?? 1), IR = nodeXY(S, 'ir'), IR0 = [IR[0], IR[1] + MEMB.gap / 2 + 50 * nodeS(S, 'ir')], p1L = between(IR0, 0, nodeXY(S, 'irs'), 52 * K)[1], IRSn = nodeXY(S, 'irs'), p1 = [IRSn[0] - 85, IRSn[1] - 44], p0 = [IR0[0], IR0[1] + 14];      // the dots start a little lower; the label stays where it was (IR0)      // starts at the middle of the receptor's foot
    ctx.save(); ctx.globalAlpha *= ir.a * S.n.irs.a * (1 - S.lay); ctx.strokeStyle = rgb(mix(PC.ins, PC.gray, dead)); ctx.lineWidth = 8.5; ctx.lineCap = 'round'; ctx.setLineDash([.01, 18]);      // a row of dots: a signal passing, not a proposed edge
    // ir.phG: a step integrates the stream itself from its own start (gt - ir.tL is the global clock at that start), so the dots slow to a stop smoothly
    ctx.lineDashOffset = -18 * ((ir.ph || 0) + (ir.phAdd || 0) + (ir.phG ? gt - ir.tL : 0)) - gt * 18 * (1 - dead) * (ir.live ?? 1); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); ctx.restore();
    { const la = ir.a * S.n.irs.a * (1 - S.lay) * (ir.lab ?? 1), o = { size: 23 * K, w: 500, col: mix(COL.dim, COL.text, .8), align: 'left', base: 'middle', a: la, halo: 5, haloCol: cyt }, lx = lerp(IR0[0], p1L[0], .5) + 18, ly = lerp(IR0[1], p1L[1], .5) + 4, dy = 15 * K;
      txt('insulin', lx, ly - dy, o); txt('signal', lx, ly + dy, o);      // two lines
      // signal down: one arrow as tall as both lines, right of them; it bobs downward a few times (ir.bob counts the bobs)
      const aa = la * (ir.arrow ?? 1) * seg(dead, .3, .7);
      if (aa > .004) {
        const ax = lx + txtW('insulin', o) + 22 * K, h = 2 * dy + 23 * K, bob = ir.bob || 0, b = bob > 0 && bob < (ir.bobN || 3) ? (1 - Math.cos(TAU * (bob % 1))) / 2 : 0, top = ly - h / 2 + b * 12 * K, hw = 9 * K;
        ctx.save(); ctx.globalAlpha *= aa; ctx.strokeStyle = rgb(COL.text); ctx.fillStyle = rgb(COL.text); ctx.lineWidth = 4.2 * K; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, top + h - hw * 1.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - hw, top + h - hw * 1.6); ctx.lineTo(ax + hw, top + h - hw * 1.6); ctx.lineTo(ax, top + h); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }
  drawEdges(S, gt);
  // the microglia tag on the AβO → TNF-α edge (proposed cell source; Discussion, p. 838)
  if (S.micTag > .004) { const A0 = nodeXY(S, 'abo'), T0 = nodeXY(S, 'tnf'); txt('via microglia?', lerp(A0[0], T0[0], .5) + lerp(0, -150, S.lay), lerp(A0[1], T0[1], .5) + lerp(-44 * BK, 4, S.lay), { size: 17 * K, w: 500, it: true, col: COL.dim, align: 'center', base: 'middle', a: S.micTag * (S.dirA ?? 1), halo: 5 }); }
  for (const k of ['ir', 'er', 'jnk', 'abo', 'tnfr', 'tnf', 'pkr', 'irs', 'eif', 'syn', 'mem']) { if (k === 'er') { ctx.save(); ctx.globalAlpha *= S.erA ?? 1; drawNode(S, k, gt); ctx.restore(); } else drawNode(S, k, gt); }
  // ribosome on the eIF2α branch: translation initiation
  const rb = S.n.ribo;
  if (rb && rb.a > .004 && S.lay < 1) {
    const E = nodeXY(S, 'eif'), Y = nodeXY(S, 'syn'), x = lerp(E[0], Y[0], .5) - 4, y = lerp(E[1], Y[1], .5) - 70 * K;
    ctx.save(); ctx.globalAlpha *= rb.a * (1 - S.lay); ctx.translate(x, y); ctx.scale(.9 * K, .9 * K); mRIBO(rb, gt); ctx.restore();
    const ra = rb.a * (1 - S.lay), st = seg(rb.stall, .44, .56);
    txt('translation', x + 52 * K, y - 12 * K, { size: 17 * K, w: 500, col: mix(COL.dim, COL.text, .8), base: 'middle', a: ra, halo: 5, haloCol: cyt });
    txt('initiation blocked', x + 52 * K, y + 10 * K, { size: 17 * K, w: 600, col: COL.text, base: 'middle', a: ra * st, halo: 5, haloCol: cyt }); txt('running', x + 52 * K, y + 10 * K, { size: 17 * K, w: 500, col: mix(COL.dim, COL.text, .8), base: 'middle', a: ra * (1 - st), halo: 5, haloCol: cyt });
  }
  ctx.restore();
  });
  ctx.restore();
  // soft bottom edge, same as the culture band's. Drawn at full strength whatever boardA is, so the cell → board cross-fade
  // goes through one fade, not two half-strength ones.
  if (S.lay < 1) claySuspend(() => { const f = BAND.fade, y1 = BAND.y + BAND.h, g = ctx.createLinearGradient(0, y1 - f, 0, y1); g.addColorStop(0, rgb(COL.bg, 0)); g.addColorStop(1, rgb(COL.bg, 1)); ctx.save(); ctx.globalAlpha *= 1 - S.lay; if (BAND_FADE.bottom) { ctx.fillStyle = g; ctx.fillRect(0, y1 - f, W, f + 2); } const g2 = ctx.createLinearGradient(0, BAND.y, 0, BAND.y + f); g2.addColorStop(0, rgb(COL.bg, 1)); g2.addColorStop(1, rgb(COL.bg, 0)); if (BAND_FADE.top) { ctx.fillStyle = g2; ctx.fillRect(0, BAND.y, W, f); } ctx.restore(); });
}
/* The data panel: a dark, tinted frosted-glass slab over the right of the cytoplasm; charts, notes and the legend sit on it
   in the normal (light-on-dark) palette. */
const PANEL = { x: 1392, y: 170, w: 502, h: 706, r: 12 };      // stops short of the bottom of the band
const panelA = S => (S.boardA || 0) * (S.nodesA ?? 1) * (1 - S.lay) * (S.panelK ?? 1);
/* Scenes 9-10 use two square panels (side = PANEL.h): the right one's right edge on the arrow legend's right edge, the left
   one's left edge on the legend's left edge. S.vivo: k = 0 the right panel is the square … 1 home at PANEL (the fork clip glides
   it home), left = alpha of the left square, a = alpha of the right panel while the board's own panel alpha is still 0. */
// SQ_TOP: the panels' top edge, level with the top of the TNFR1 glyph (its outermost CRD: 79 glyph units above its centre, which sits
// MEMB.gap / 2 below the node). The bottom stays at PANEL's bottom, so they are a little taller than wide.
const SQ_TOP = Math.round(MEMB_Y + (311 - 300) * BKY + MEMB.gap / 2 - 79.1 * NODES.tnfr.s0 * BK);
const panelSq = () => { const L = legendRect(), s = PANEL.h, h = PANEL.y + PANEL.h - SQ_TOP; return { R: { x: L.x + L.w - s, y: SQ_TOP, w: s, h }, L: { x: L.x, y: SQ_TOP, w: s, h } }; };
const panelRect = S => { const k = ease(S.vivo ? S.vivo.k : 1), Q = panelSq().R, x = lerp(Q.x, PANEL.x, k), w = lerp(Q.w, PANEL.w, k), w2 = w * lerp(1, .65, ease(S.panelHalf || 0));      // panelHalf: the panel narrows to 60% width, right edge fixed (scene 12)
  const y = lerp(Q.y, PANEL.y, k), h = lerp(Q.h, PANEL.h, k), h2 = h * lerp(1, PANEL_SHORT, ease(S.panelShort || 0));      // panelShort: shorter, bottom edge fixed (S9A/S9B)
  return { x: x + w - w2, y: y + h - h2, w: w2, h: h2 }; };      // anchored at the bottom: it grows upward
const PANEL_SHORT = .56;
function drawPanel(S) {
  const V = S.vivo || { a: 0, left: 0 }, R0 = panelRect(S), Lq = panelSq().L;
  dataGlass(Lq.x, Lq.y, Lq.w, Lq.h, V.left, PANEL.r, false);      // untinted: the cytoplasm is dark enough behind them
  dataGlass(R0.x, R0.y, R0.w, R0.h, Math.max(panelA(S), V.a), PANEL.r, false);
}
