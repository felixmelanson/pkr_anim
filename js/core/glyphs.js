'use strict';
// Small molecule glyphs for the culture-scale scenes: AβO, TNF-α, infliximab (IgG), neutralized TNF-α.
// gTNF / gAb / gBound follow astrocyte_anim/js/core/glyphs.js; gABO is new. Solid fills, so clay applies.
function gTNF(c, s, a, col = PC.tnf) {       // TNF-α: homotrimer
  for (let k = 0; k < 3; k++) {
    const an = k * TAU / 3 - Math.PI / 2; c.save(); c.rotate(an); c.translate(s * .25, 0);
    c.beginPath(); c.ellipse(0, 0, s * .4, s * .23, 0, 0, TAU); c.fillStyle = rgb(col, a); c.fill();
    c.strokeStyle = rgb(mix(col, [0, 0, 0], .5), a * .6); c.lineWidth = Math.max(.6, s * .05); c.stroke(); c.restore();
  }
}
/* Aβ oligomer: the four-cylinder cluster of the paper's own Fig. 7, ported 1:1 from Felix's SVG replica
   (cylinder centres, radii and heights are that file's numbers, in its 2212×1664 box; drawn back to front).
   s = glyph size (the cluster is about 0.8 s wide and 1.15 s tall). Large glyphs get the replica's shading
   (edge-darkened body, pale cap, seam); small ones in the medium are flat fills so clay can light them. */
const ABO_CYL = [[1016, 191, 620, 191, 48], [726, 444, 1280, 189, 49], [1296, 444, 1280, 196, 49], [1006, 640, 1465, 194, 49]];   // cx, topY, bottomY, rx, ry
function gABO(c, s, a, col = PC.abo) {
  const k = s * 1.15 / 1371, big = s >= 22;
  const edge = mix(col, [0, 0, 0], .2), cap = mix(col, [255, 255, 255], .38), seam = mix(col, [0, 0, 0], .45);
  c.save(); c.scale(k, k); c.translate(-1014, -828);
  for (const [cx, ty, by, rx, ry] of ABO_CYL) {
    c.beginPath(); c.moveTo(cx - rx, ty); c.lineTo(cx - rx, by); c.ellipse(cx, by, rx, ry, 0, Math.PI, 0, true); c.lineTo(cx + rx, ty); c.closePath();
    if (big) { const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0); g.addColorStop(0, rgb(edge, a)); g.addColorStop(.12, rgb(mix(col, edge, .35), a)); g.addColorStop(.45, rgb(col, a)); g.addColorStop(.78, rgb(mix(col, edge, .2), a)); g.addColorStop(1, rgb(mix(edge, [0, 0, 0], .12), a)); c.fillStyle = g; }
    else c.fillStyle = rgb(mix(col, edge, .25), a);
    c.fill();
    c.beginPath(); c.ellipse(cx, ty, rx, ry, 0, 0, TAU); c.fillStyle = rgb(cap, a); c.fill();
    if (big) { c.beginPath(); c.ellipse(cx, ty, rx, ry, 0, 0, Math.PI); c.strokeStyle = rgb(seam, a * .4); c.lineWidth = 3 + 1.2 / k * .5; c.stroke(); }
  }
  c.restore();
}
function gAb(c, s, a, col = PC.ab) {         // IgG: Fc stem + 2 Fab arms (heavy) + light chains
  c.lineCap = 'round';
  const dm = (x0, y0, x1, y1) => { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, gx = (x1 - x0) * .07, gy = (y1 - y0) * .07; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx - gx, my - gy); c.moveTo(mx + gx, my + gy); c.lineTo(x1, y1); c.stroke(); };
  c.strokeStyle = rgb(col, a); c.lineWidth = s * .15;
  dm(0, s * .06, 0, s * .6); dm(-s * .05, -s * .02, -s * .4, -s * .45); dm(s * .05, -s * .02, s * .4, -s * .45);
  c.lineWidth = s * .065; c.strokeStyle = rgb(col, a * .7);
  c.beginPath(); c.moveTo(-s * .2, 0); c.lineTo(-s * .53, -s * .38); c.moveTo(s * .2, 0); c.lineTo(s * .53, -s * .38); c.stroke();
}
function gBound(c, s, a) {                   // neutralized TNF-α: desaturated grey, held in the Fab arms of an IgG
  const g = mix(PC.tnf, PC.gray, .72);
  c.save(); c.translate(0, -s * .2); gTNF(c, s * .9, a, g); c.restore();
  const S = s * 1.25; c.save(); c.translate(0, s * .28 + S * .45); gAb(c, S, a); c.restore();
}
// IL-1α and C1q copied from physio_render/src/engines/lab.js (the same shapes as the astrocyte talk).
function gIL1(c, s, a, col = PC.il1) {       // IL-1α: β-trefoil fold
  c.fillStyle = rgb(col, a); c.beginPath();
  for (let k = 0; k < 3; k++) { const an = k * TAU / 3 - Math.PI / 2, x = Math.cos(an) * s * .28, y = Math.sin(an) * s * .28; c.moveTo(x + s * .36, y); c.arc(x, y, s * .36, 0, TAU); }
  c.fill(); c.strokeStyle = rgb(mix(col, [0, 0, 0], .55), a * .7); c.lineWidth = .8; c.stroke();
}
function gC1q(c, s, a, col = PC.c1q) {       // C1q: "bouquet of tulips", collagen stalk + 6 globular heads
  c.strokeStyle = rgb(col, a); c.fillStyle = rgb(col, a); c.lineCap = 'round';
  c.lineWidth = s * .15; c.beginPath(); c.moveTo(0, s * .55); c.lineTo(0, s * .05); c.stroke();
  c.lineWidth = s * .07;
  const heads = [];
  for (let k = 0; k < 6; k++) {
    const an = -Math.PI / 2 + (k - 2.5) * .34, hx = Math.cos(an) * s * .62, hy = s * .05 + Math.sin(an) * s * .62;
    c.beginPath(); c.moveTo(0, s * .05); c.quadraticCurveTo(Math.cos(an) * s * .22, s * .05 + Math.sin(an) * s * .32, hx, hy); c.stroke(); heads.push([hx, hy]);
  }
  for (const [hx, hy] of heads) { c.beginPath(); c.arc(hx, hy, s * .14, 0, TAU); c.fill(); }
}
function glyph(c, type, x, y, s, rot, a) {
  if (a <= .01) return;
  const draw = c => {
    c.save(); c.translate(x, y); c.rotate(rot);
    switch (type) {
      case 'tnf': gTNF(c, s, a); break; case 'abo': gABO(c, s, a); break; case 'ab': gAb(c, s * 1.2, a); break; case 'tnfb': gBound(c, s, a); break; case 'il1': gIL1(c, s, a); break; case 'c1q': gC1q(c, s * 1.35, a); break;
    }
    c.restore();
  };
  if (typeof texEl === 'function') texEl(type, c, draw, x, y, s * 1.6); else draw(c);      // each glyph type has its own look (elements page)
}
const GSIZE = { tnf: 13, abo: 15, ab: 14, tnfb: 13, il1: 13, c1q: 14 };
