// Clay treatment, copied from physio_render/src/engines/clay.js.
// Changes for this repo: wrapped as a classic script (no ES module exports; withClay / claySuspend are globals),
// local helper names kept private in an IIFE, and the "background-sized" cut-off is a parameter (CLAY_MAX_FRAC).
// The drawing logic is unchanged.
const { withClay, claySuspend, clayResume, clayLite, setClayMax } = (() => {
/* Clay for everything, not just membranes.

   paintMembrane() gives membranes the clay look, but nuclei, organelles, glyphs, ions drawn as plain arcs and
   stroked shapes never pass through it. withClay(c, dark, fn) runs fn with the context patched so that, while
   it runs, every plain fill gets clay's soft drop shadow plus a lit-to-shaded volume gradient (light from the
   upper left, fixed in screen space), and every thick stroke gets the drop shadow.

   Left alone: fills inside claySuspend (membranes already painted as clay), gradient or pattern fills (glows,
   fluid), faint overlays (alpha < .45), background-sized fills (slabs, patches), thin strokes, and text.
   The path is mirrored into a Path2D as it is built, so the effect never disturbs the caller's current path. */
const P = CanvasRenderingContext2D.prototype;
const TINY = 6;            // shapes thinner than this (px at 1920 wide: puncta, small glyph parts) get a plain fill: no shadow pass, far cheaper
let CLAY_MAX_FRAC = .35;   // fills larger than this fraction of the canvas' short side are treated as background and left flat
const OPS = ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'closePath'];
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

let SUSPEND = 0;
/** Run fn with the clay patch paused (for shapes that are already painted as clay). */
/** Run fn with clay's drop-shadow pass skipped (volume kept). The blurred shadow is by far the costly part; on a black page it is invisible anyway. */
let LITE = 0;
function clayLite(fn) { LITE++; try { return fn(); } finally { LITE--; } }
function claySuspend(fn) { SUSPEND++; try { return fn(); } finally { SUSPEND--; } }
/** Run fn with clay switched back on inside a claySuspend (the confocal view is drawn suspended; its hybrid cells want clay). */
function clayResume(fn) { const s = SUSPEND; SUSPEND = 0; try { return fn(); } finally { SUSPEND = s; } }

const alphaOf = s => {
  if (typeof s !== 'string') return 0;
  const m = s.match(/^rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(','); return p.length > 3 ? +p[3] : 1; }
  return s[0] === '#' ? (s.length === 9 ? parseInt(s.slice(7), 16) / 255 : 1) : 1;
};
const sameM = (m, n) => n && Math.abs(m.a - n.a) + Math.abs(m.b - n.b) + Math.abs(m.c - n.c) + Math.abs(m.d - n.d) + Math.abs(m.e - n.e) + Math.abs(m.f - n.f) < 1e-6;

function withClay(c, dark, fn) {
  let rec = null, bb = null, mt = null;
  const grow = (x, y, r = 0) => { if (x - r < bb[0]) bb[0] = x - r; if (y - r < bb[1]) bb[1] = y - r; if (x + r > bb[2]) bb[2] = x + r; if (y + r > bb[3]) bb[3] = y + r; };
  const bound = (op, a) => {
    switch (op) {
      case 'moveTo': case 'lineTo': grow(a[0], a[1]); break;
      case 'quadraticCurveTo': grow(a[0], a[1]); grow(a[2], a[3]); break;
      case 'bezierCurveTo': grow(a[0], a[1]); grow(a[2], a[3]); grow(a[4], a[5]); break;
      case 'arcTo': grow(a[0], a[1]); grow(a[2], a[3]); break;
      case 'arc': grow(a[0], a[1], a[2]); break;
      case 'ellipse': grow(a[0], a[1], Math.max(a[2], a[3])); break;
      case 'rect': case 'roundRect': grow(a[0], a[1]); grow(a[0] + a[2], a[1] + a[3]); break;
    }
  };
  const own = {
    beginPath() { rec = new Path2D(); bb = [Infinity, Infinity, -Infinity, -Infinity]; mt = c.getTransform(); return P.beginPath.call(c); },
    fill(...a) {
      const usable = rec && !SUSPEND && !(a[0] instanceof Path2D) && bb[0] < Infinity;
      if (!usable) return P.fill.apply(c, a);
      const m = c.getTransform();
      if (!sameM(m, mt) || alphaOf(c.fillStyle) * c.globalAlpha < .45) return P.fill.apply(c, a);
      const k = Math.hypot(m.a, m.b), w = (bb[2] - bb[0]) * k, h = (bb[3] - bb[1]) * k, d = Math.min(w, h);
      if (d < TINY * c.canvas.width / 1920 || Math.max(w, h) > CLAY_MAX_FRAC * Math.min(c.canvas.width, c.canvas.height)) return P.fill.apply(c, a);
      const rule = typeof a[0] === 'string' ? a[0] : 'nonzero', path = rec;
      // the fill itself carries the drop shadow
      if (LITE) P.fill.apply(c, a);
      else {
        c.save();
        c.shadowColor = dark ? 'rgba(0,0,0,.85)' : 'rgba(20,32,44,.30)'; c.shadowBlur = clamp(d * .22, 1.5, 9); c.shadowOffsetY = clamp(d * .09, .6, 4);
        P.fill.apply(c, a);
        c.restore();
      }
      // volume: lit upper left, shaded lower right, across the shape's own box in screen space
      // (filled through the shape's own path with the gradient mapped back into user space: one fill, no clip pass)
      const xs = [], ys = [];
      for (const [x, y] of [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
      const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
      const det = m.a * m.d - m.b * m.c || 1, inv = (x, y) => [(m.d * (x - m.e) - m.c * (y - m.f)) / det, (m.a * (y - m.f) - m.b * (x - m.e)) / det];
      const g0 = inv(x0, y0), g1 = inv(x1, y1), g = c.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
      g.addColorStop(0, dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.42)');
      g.addColorStop(.45, 'rgba(255,255,255,0)');
      g.addColorStop(1, dark ? 'rgba(0,0,0,.35)' : 'rgba(30,40,52,.16)');
      c.save(); c.fillStyle = g; P.fill.call(c, path, rule); c.restore();
    },
    stroke(...a) {
      if (SUSPEND || LITE || a[0] instanceof Path2D) return P.stroke.apply(c, a);
      const m = c.getTransform(), k = Math.hypot(m.a, m.b), lw = c.lineWidth * k;
      if (lw < 2.2 || alphaOf(c.strokeStyle) * c.globalAlpha < .45) return P.stroke.apply(c, a);
      c.save();
      c.shadowColor = dark ? 'rgba(0,0,0,.8)' : 'rgba(20,32,44,.26)'; c.shadowBlur = clamp(lw * .6, 1.2, 6); c.shadowOffsetY = clamp(lw * .25, .5, 3);
      P.stroke.apply(c, a);
      c.restore();
    },
  };
  for (const op of OPS) if (P[op]) own[op] = function (...a) { if (rec && rec[op]) { rec[op](...a); bound(op, a); } return P[op].apply(c, a); };
  Object.assign(c, own);
  try { return fn(); }
  finally { for (const k of Object.keys(own)) delete c[k]; }
}

return { withClay, claySuspend, clayResume, clayLite, setClayMax: v => { CLAY_MAX_FRAC = v; } };
})();
