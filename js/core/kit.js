'use strict';
/* Shared drawing kit, adapted from physio_render/src/engines/kit.js (classic script instead of an ES module).
   In physio_render every shape goes through atlas.js paintMembrane(), which switches render styles. Here there is one
   style: a rim fill and a body fill, both plain fills, so the clay patch (js/clay.js) gives them shadow and volume.
   Kept from the original: polyPath, shape, blobPts, dom, tube, rod, helix, bilayer, qpt. Dropped: bone palettes, ion(), propeller(). */
function paintMembrane(c, path, ex, pal) {
  path(ex); c.fillStyle = rgb(pal.rim); c.fill();      // rim: carries the clay drop shadow
  path(0); c.fillStyle = rgb(pal.body); c.fill();      // body: clay volume (its small shadow reads as a bevel on the rim)
}
/** Closed smooth outline through flat points [x0,y0,x1,y1,…], pushed outward by ex. */
function polyPath(c, pts, ex = 0) {
  const n = pts.length / 2;
  let area = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1]; }
  const sgn = area > 0 ? 1 : -1, q = new Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    q[i * 2] = pts[i * 2] + ty * ex * sgn; q[i * 2 + 1] = pts[i * 2 + 1] - tx * ex * sgn;
  }
  c.beginPath();
  c.moveTo((q[0] + q[(n - 1) * 2]) / 2, (q[1] + q[(n - 1) * 2 + 1]) / 2);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; c.quadraticCurveTo(q[i * 2], q[i * 2 + 1], (q[i * 2] + q[j * 2]) / 2, (q[i * 2 + 1] + q[j * 2 + 1]) / 2); }
  c.closePath();
}
/** A membrane-style shape from outline points (relative to x, y). */
function shape(c, x, y, pts, pal, ex = 1.6) { c.save(); c.translate(x, y); paintMembrane(c, e => polyPath(c, pts, e), ex, pal); c.restore(); }
/** Outline points of a blob: fn(theta) -> [rx, ry], sampled n times. */
function blobPts(n, fn) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = fn(a); p.push(Math.cos(a) * r[0], Math.sin(a) * r[1]); } return p; }
/** A protein domain: an ellipse painted like a membrane. */
function dom(c, x, y, rx, ry, rot, pal, ex = 1.4) {
  c.save(); c.translate(x, y); c.rotate(rot);
  paintMembrane(c, e => { c.beginPath(); c.ellipse(0, 0, rx + e, ry + e, 0, 0, TAU); }, ex, pal);
  c.restore();
}
/** A tapered tube through flat points with per-point widths. */
function tube(c, pts, ws, pal, ex = 1.4) { const s = { pts, ws, n: ws.length - 1 }; paintMembrane(c, e => { c.beginPath(); addStrand(c, s, e); }, ex, pal); }
/** A rounded rod (α-helix / TM helix) from (x0,y0) to (x1,y1). */
function rod(c, x0, y0, x1, y1, w, pal, ex = 1.2) { tube(c, [x0, y0, x1, y1], [w, w], pal, ex); }
/** An α-helix: a rod with its helical turns drawn across it. */
function helix(c, x0, y0, x1, y1, w, pal) {
  rod(c, x0, y0, x1, y1, w, pal, 1.2);
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, n = Math.floor(L / (w * .9));
  c.strokeStyle = rgb(pal.rim, .45); c.lineWidth = Math.max(.5, w * .14); c.lineCap = 'round'; c.beginPath();
  for (let k = 1; k < n; k++) { const cx = x0 + ux * k * w * .9, cy = y0 + uy * k * w * .9; c.moveTo(cx - uy * w * .42 - ux * w * .2, cy + ux * w * .42 - uy * w * .2); c.lineTo(cx + uy * w * .42 + ux * w * .2, cy - ux * w * .42 + uy * w * .2); }
  c.stroke();
}
/** Lipid bilayer from x0 to x1: head-group beads on both leaflets with acyl tails between. yf(x) bends it. */
function bilayer(c, y, x0, x1, o = {}) {
  const pal = NP.lipid, gap = o.gap ?? 22, step = o.step ?? 10.5, a = o.a ?? 1, yf = o.yf || (() => 0);
  if (a <= .004) return;
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = rgb(pal.rim, .5); c.lineWidth = 1.1; c.beginPath();
  for (let x = x0 + step / 2; x < x1; x += step) { const yy = y + yf(x); c.moveTo(x - 1.4, yy + 4); c.lineTo(x - .8, yy + gap / 2 - 1); c.moveTo(x + 1.4, yy + 4); c.lineTo(x + .8, yy + gap / 2 - 1); c.moveTo(x - 1.4, yy + gap - 4); c.lineTo(x - .8, yy + gap / 2 + 1); c.moveTo(x + 1.4, yy + gap - 4); c.lineTo(x + .8, yy + gap / 2 + 1); }
  c.stroke();
  for (const dy of [0, gap]) for (let x = x0 + step / 2; x < x1; x += step) { c.beginPath(); c.arc(x, y + yf(x) + dy, step * .42, 0, TAU); c.fillStyle = rgb(pal.body); c.fill(); c.strokeStyle = rgb(pal.rim, .8); c.lineWidth = .9; c.stroke(); }
  c.restore();
}
/** Point along a quadratic path at u. */
const qpt = (x0, y0, cx, cy, x1, y1, u) => { const v = 1 - u; return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]; };
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
