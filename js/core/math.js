'use strict';
// Small math, random number and colour helpers used everywhere.
const W = 1920, H = 1080, TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sstep = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eOut = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
const bump = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const angd = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
// shift a colour's hue (degrees), saturation and lightness (-100..100) in HSL, as the elements page's sliders do
function hslShift(c, dh = 0, ds = 0, dl = 0) {
  const [r, g, b] = c.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0; const l = (max + min) / 2;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  const H = (((h + dh) % 360) + 360) % 360, S = Math.min(1, Math.max(0, s * (1 + ds / 100)));
  const L = Math.min(1, Math.max(0, dl >= 0 ? l + (1 - l) * (dl / 100) : l * (1 + dl / 100)));
  const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((H / 60) % 2) - 1)), m = L - C / 2;
  const [r1, g1, b1] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}
