'use strict';
/* Canvas filters that work in every browser. Chrome and Firefox support ctx.filter ('blur(4px)', 'brightness(.4)'); Safari ignores
   it on canvas, which left the frosted glass fully transparent and the out-of-focus cells sharp. drawFiltered() draws an image
   through a filter: the real one where it works, otherwise an equivalent built from plain drawImage calls:
     blur(r)        drawn small and scaled back up (two passes), which approximates a gaussian of radius r
     brightness(k)  the image, then black at 1 - k laid on top of its own pixels ('source-atop'): colour × k, alpha kept
     saturate(s)    skipped (only the glass uses it, as a slight boost)
   Use: drawFiltered(ctx, 'blur(6px)', img, sx, sy, sw, sh, dx, dy, dw, dh) — the same arguments as the 9-argument drawImage. */
// tested by its effect, not the property: WebKit accepts ctx.filter = 'blur(2px)' and then draws without it
const CANVAS_FILTER = (() => { try {
  const src = document.createElement('canvas'); src.width = src.height = 9; const g = src.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(4, 4, 1, 1);
  const dst = document.createElement('canvas'); dst.width = dst.height = 9; const d = dst.getContext('2d', { willReadFrequently: true }); d.filter = 'blur(2px)'; d.drawImage(src, 0, 0);
  return d.getImageData(1, 4, 1, 1).data[3] > 0;      // three pixels away from the dot: something only if it really blurred
} catch (e) { return false; } })();
const FILT_TMP = [];
function filtTmp(i, w, h) {
  let c = FILT_TMP[i]; if (!c) c = FILT_TMP[i] = document.createElement('canvas');
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, Math.ceil(w)); c.height = Math.max(c.height, Math.ceil(h)); }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  return g;
}
function drawFiltered(ctx, filter, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!filter || filter === 'none') return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  if (CANVAS_FILTER) { const keep = ctx.filter; ctx.filter = filter; ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); ctx.filter = keep; return; }
  let src = img, x = sx, y = sy, w = sw, h = sh;
  const bm = /brightness\(([\d.]+)\)/.exec(filter);
  if (bm) {      // colour × k on a copy, alpha untouched
    const g = filtTmp(0, w, h); g.drawImage(src, x, y, w, h, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - +bm[1])})`; g.fillRect(0, 0, w, h);
    src = g.canvas; x = 0; y = 0;
  }
  const blm = /blur\(([\d.]+)px\)/.exec(filter), r = blm ? +blm[1] : 0;
  if (r > .8) {
    // a smooth blur without ctx.filter: shrink in halving steps (no aliasing), soften the small copy with a separable 5-tap
    // pass made of offset draws, then grow back in doubling steps (a single big stretch shows blocks that crawl as cells move)
    // spread matched to a gaussian of sigma ≈ r: shrink by a power of two, then n soft passes (each ≈ 1.1 small px) make up the rest
    const target = Math.max(1 / 32, Math.min(1, Math.pow(2, -Math.round(Math.log2(Math.max(1, r / 1.6))))));
    let cw = w, ch = h, cur = src, cx = x, cy = y, k = 1, slot = 1;
    while (k * .5 >= target * .99) { const nw = Math.max(1, Math.round(cw * .5)), nh = Math.max(1, Math.round(ch * .5)); const g = filtTmp(slot, nw, nh); g.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh); cur = g.canvas; cx = cy = 0; cw = nw; ch = nh; k *= .5; slot = slot === 1 ? 2 : 1; }
    const soft = (dxs, dys) => { const g = filtTmp(slot, cw + 4, ch + 4); g.globalAlpha = 1; for (const [o, wgt] of [[-2, .12], [-1, .23], [0, .3], [1, .23], [2, .12]]) { g.globalAlpha = wgt; g.globalCompositeOperation = 'lighter'; g.drawImage(cur, cx, cy, cw, ch, 2 + o * dxs, 2 + o * dys, cw, ch); } cur = g.canvas; cx = cy = 2; slot = slot === 1 ? 2 : 1; };
    const n = Math.max(1, Math.min(4, Math.round(Math.pow(r * k / 1.1, 2)))); for (let q = 0; q < n; q++) { soft(1, 0); soft(0, 1); }
    while (cw * 2 < dw * .75 && cw * 2 < 4096) { const nw = cw * 2, nh = ch * 2; const g = filtTmp(slot, nw + 8, nh + 8); g.drawImage(cur, cx - 1, cy - 1, cw + 2, ch + 2, 2, 2, nw + 4, nh + 4); cur = g.canvas; cx = cy = 4; cw = nw; ch = nh; slot = slot === 1 ? 2 : 1; }
    const keep = ctx.imageSmoothingQuality; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, cx, cy, cw, ch, dx, dy, dw, dh); ctx.imageSmoothingQuality = keep;
    return;
  }
  ctx.drawImage(src, x, y, w, h, dx, dy, dw, dh);
}
