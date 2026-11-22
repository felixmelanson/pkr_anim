'use strict';
// Pathway-board molecules, drawn with the kit (rim + body fills, so clay applies). Patterns follow
// physio_render/src/engines/molecules.js: receptors as stacked domains with a TM rod through the bilayer
// (TNFR1 like its RANK: cysteine-rich domain arms; IR as an (αβ)2 dimer), soluble proteins as lobed domains.
// Each icon is drawn around the origin in a ~100 px box; the board scales and places it.
// st: { lit 0..1 (phosphorylated / active → gold), off 0..1 (bypassed / not activated → grey) }
function nodePal(st = {}, base = 'prot') { let p = NP[base]; if (st.lit) p = palMix(p, NP.on, st.lit); if (st.off) p = palMix(p, NP.off, st.off); return p; }

function mTNF(st = {}) { gTNF(ctx, 50, 1, mix(PC.tnf, PC.gray, (st.off || 0) * .8)); }
function mABO(st = {}) { gABO(ctx, 50, 1, mix(PC.abo, PC.gray, (st.off || 0) * .8)); }
// TNFR1: three chains, each four CRDs outside, one TM helix, one death domain inside. bound: the chains close on the ligand.
function mTNFR1(st = {}) {
  const P = nodePal({ off: st.off }, 'tnfr'), b = st.bound || 0, D = nodePal({ lit: st.lit, off: st.off }, 'tnfr');
  for (const k of [-1, 1, 0]) {
    const x = k * lerp(24, 15, b), lean = k * lerp(.34, .12, b);
    rod(ctx, x, -17, x, 17, 7.5, P);
    for (let j = 0; j < 4; j++) { const yy = -27 - j * 14.5; dom(ctx, x + Math.sin(lean) * (27 + j * 14.5) * (k ? 1 : 0), yy, 6.6, 8.6, lean, P, 1.2); }
    dom(ctx, x + k * 3, 30, 8.5, 11, k * .2, D, 1.3);
  }
}
// phospho badge alpha from the node's lit level: fully there from lit = .16, so a part-lit node (4-PBA) never shows a half-faded P
const pbA = l => ease(seg(l || 0, .06, .16));
// Insulin receptor: (αβ)2, ectodomain an inverted V, two TM helices, two kinase domains. off: signal dead.
function mIR(st = {}) {
  const P = nodePal(st, 'ir');
  for (const k of [-1, 1]) {
    rod(ctx, k * 9, -17, k * 9, 17, 7, P);
    dom(ctx, k * 15, -46, 11, 27, -k * .28, P, 1.3); dom(ctx, k * 6, -74, 9, 10, 0, P, 1.2);
    dom(ctx, k * 13, 31, 11.5, 13.5, k * .15, P, 1.3);
  }
}
// PKR: two dsRNA-binding motifs on a linker, bilobal kinase domain. lit: PKR-pThr451.
function mPKR(st = {}) {
  const P = nodePal(st);
  ctx.strokeStyle = rgb(P.rim, .9); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-50, 12); ctx.quadraticCurveTo(-30, -4, -10, -14); ctx.stroke();
  dom(ctx, -52, 14, 11, 9, .5, P, 1.2); dom(ctx, -32, -2, 11, 9, -.4, P, 1.2);
  dom(ctx, 8, 12, 27, 22, .15, P, 1.6); dom(ctx, -2, -18, 19, 15, -.2, P, 1.5);
  pBadge(32, -14, 13, pbA(st.lit));
}
// eIF2α: S1 domain (Ser51 loop), helical domain, C-terminal domain. lit: eIF2α-pSer51.
function mEIF(st = {}) {
  const P = nodePal(st);
  dom(ctx, 16, 12, 18, 14, .3, P, 1.4); dom(ctx, 32, -10, 11, 10, 0, P, 1.2); dom(ctx, -10, -6, 22, 18, -.2, P, 1.6);
  pBadge(-30, -22, 13, pbA(st.lit));
}
// IRS-1: PH and PTB domains, then a long unstructured tail that carries the serine sites. lit: IRS-1pSer636.
function mIRS(st = {}) {
  const P = nodePal(st);
  ctx.strokeStyle = rgb(P.rim); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, 2);      // tail and P sit 16 units further left on the glyph (the arrowheads arriving from the right clear them)
  ctx.bezierCurveTo(6, -16, 18, 20, 32, 2); ctx.bezierCurveTo(40, -8, 46, 4, 52, 10); ctx.stroke();
  dom(ctx, -36, -2, 17, 15, 0, P, 1.5); dom(ctx, -6, 0, 18, 16, 0, P, 1.5);
  pBadge(24, -14, 13, pbA(st.lit));
}
// Synapse: presynaptic bouton with vesicles over a dendritic spine with its PSD. loss 0..1: vesicles and PSD go, grey.
function mSYN(st = {}) {
  const loss = st.loss || 0, P = nodePal({ off: loss * .9 }, 'syn'), gap = lerp(0, 7, loss);
  rod(ctx, 0, 30, 0, 52, 9, P); dom(ctx, 0, 20 + gap * .4, 21, 15, 0, P, 1.5);
  dom(ctx, 0, -20 - gap, 27, 20, 0, P, 1.6);
  const va = 1 - loss;
  if (va > .01) {
    for (const [vx, vy] of [[-12, -24], [0, -28], [12, -24], [-6, -15], [7, -15]]) { ctx.beginPath(); ctx.arc(vx, vy - gap, 4.2, 0, TAU); ctx.fillStyle = rgb(P.rim, va); ctx.fill(); }
    ctx.strokeStyle = rgb(PC.phos, va); ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, 8.5 + gap * .4); ctx.lineTo(12, 8.5 + gap * .4); ctx.stroke();   // PSD
  }
}
// Memory readout: the novel-object arena (two objects in a box). loss: desaturated.
function mMEM(st = {}) {
  const loss = st.loss || 0, c1 = mix(COL.teal, PC.gray, loss), ink = mix(COL.ink, PC.gray, loss * .6);
  ctx.beginPath(); ctx.roundRect(-34, -30, 68, 60, 9); claySuspend(() => { ctx.fillStyle = rgb(COL.panel); ctx.fill(); }); ctx.strokeStyle = rgb(ink); ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(-15, 2, 10, 0, TAU); ctx.fillStyle = rgb(c1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(27, 12); ctx.lineTo(3, 12); ctx.closePath(); ctx.fillStyle = rgb(mix(PC.tnf, PC.gray, .25 + .75 * loss)); ctx.fill();
}
// ER: three stacked cisternae studded with ribosomes. lit: ER stress (swollen, gold).
function mER(st = {}) {
  const P = nodePal(st, 'er'), sw = 1 + .35 * (st.lit || 0);
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * 21, w = 12 * sw, L = 52 - i * 4, pts = [], ws = [];
    for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push(lerp(-L, L, u), y + Math.sin(u * Math.PI) * -9 + Math.sin(u * 9 + i) * 2); ws.push(w * (.75 + .25 * Math.sin(u * Math.PI))); }
    tube(ctx, pts, ws, P, 1.4);
    for (let k = 0; k < 5; k++) { const u = (k + .5) / 5; ctx.beginPath(); ctx.arc(lerp(-L, L, u) * .92, y + Math.sin(u * Math.PI) * -9 - w * .62, 2.6, 0, TAU); ctx.fillStyle = rgb(NP.ribo.rim); ctx.fill(); }
  }
}
// Ribosome on its mRNA with a nascent chain. stall 0..1: initiation blocked, the chain stops growing and it greys.
function mRIBO(st = {}, gt = 0) {
  const stall = st.stall || 0, P = nodePal({ off: stall * .8 }, 'ribo');
  ctx.strokeStyle = rgb(P.rim, .9); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-46, 9); ctx.bezierCurveTo(-20, 3, 20, 15, 46, 8); ctx.stroke();   // mRNA
  const run = (1 - stall), ph = gt * 1.6 * run, n = 5;
  ctx.strokeStyle = rgb(mix(COL.teal, PC.gray, stall), .95); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(4, -14);
  for (let k = 1; k <= n; k++) ctx.lineTo(4 + k * 6 * lerp(1, .5, stall), -14 - k * 5 * lerp(1, .45, stall) + Math.sin(k * 1.8 + ph) * 3 * run);
  ctx.stroke();
  dom(ctx, 0, 10, 15, 8, 0, P, 1.3); dom(ctx, 0, -5, 18, 13, 0, P, 1.5);
}
function mJNK(st = {}) { const P = nodePal(st); dom(ctx, -13, 0, 13, 11, 0, P, 1.3); dom(ctx, 13, 2, 13, 11, 0, P, 1.3); }
// generic kinase slot (PERK, GCN2, HRI): same bilobal shape as PKR, no RNA-binding arms
function mKIN(st = {}) { const P = nodePal(st); dom(ctx, 4, 10, 24, 20, .15, P, 1.6); dom(ctx, -4, -16, 17, 13, -.2, P, 1.5); pBadge(28, -12, 12, pbA(st.lit)); }
// a node that has been removed (knockout): dashed grey outline where it was
function mGONE(r = 40) { ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = rgb(PC.gray); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore(); }
const MOL = { abo: mABO, tnf: mTNF, tnfr: mTNFR1, ir: mIR, pkr: mPKR, eif: mEIF, irs: mIRS, syn: mSYN, mem: mMEM, er: mER, jnk: mJNK, kin: mKIN };
// the elements-page id of each board molecule (its look in the scenes)
const MOL_EL = { tnfr: 'tnfr1' };
