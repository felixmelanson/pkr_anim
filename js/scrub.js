'use strict';
/* Liquid-glass scrub bar: a faithful port of the "Liquid Glass Slider" CodePen (MIT licence, © 2026 FGAMER768). The pen's exact
   geometry and physics (90×60 thumb, resting at 0.6 scale in the pen and 0.65 here, 18 px track, squircle bezel 16, glass thickness 80, refractive index
   1.45, the same three springs, the same displacement and specular maps and filter chain), built in the pen's own coordinates
   and then shrunk as a whole with one CSS scale (SCALE), so the lens behaves exactly as in the pen, only smaller. Pressing grows
   the thumb into a lens that bends the track and the blue fill into its rim; Chrome refracts the live backdrop
   (backdrop-filter: url()), other browsers a copy of the track drawn inside the thumb (the pen's own fallback).
   Changes for the viewer: the track width follows the bar, a press on the track jumps there, and set(v) follows playback.
   LiquidScrub(el, { onInput(v) }) → { set(v), dragging() }; v is 0..1. */
function LiquidScrub(el, o = {}) {
  const SCALE = (el.clientHeight || 30) / 60; let TW = Math.round(el.clientWidth / SCALE) || 400;      // the pen's units (everything below is the pen's numbers), scaled to the bar's CSS height
  const c = { w: 90, h: 60, r: 30, tw: TW, th: 18, bw: 16, gt: 80, ri: 1.45, sr: .65, sd: .9 };      // sr: the resting thumb's scale (the pen's .6, a little larger here); sd: pressed (the pen's 1, a gentler grow)
  const uid = 'lgs' + Math.random().toString(36).slice(2, 7);
  // the drawn bar is inset by half the resting thumb at each end, so it spans exactly the thumb centre's travel: the thumb stays
  // centred on the blue edge all the way (at 0 on the bar's left end, at 100 on its right end)
  const HALF = c.w * c.sr / 2; let TRW = c.tw - 2 * HALF;
  el.innerHTML = `
    <div class="lg-root" style="width:${c.tw}px;height:${c.h}px;transform:scale(${SCALE})">
      <div class="lg-track" style="left:${HALF}px;width:${TRW}px"><div class="lg-track-inner"><div class="lg-fill"></div></div></div>
      <div class="lg-thumb">
        <div class="lg-clone"><div class="lg-clone-inner"></div></div>
        <div class="lg-thumb-inner"></div>
        <svg style="width:0;height:0;position:absolute" aria-hidden="true"><defs>
          <filter id="${uid}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blurred_source"/>
            <feImage class="lg-disp" href="" x="0" y="0" width="${c.w}" height="${c.h}" result="displacement_map" preserveAspectRatio="none"/>
            <feDisplacementMap class="lg-dmap" in="blurred_source" in2="displacement_map" scale="30" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
            <feColorMatrix in="displaced" type="saturate" values="7" result="displaced_saturated"/>
            <feImage class="lg-spec" href="" x="0" y="0" width="${c.w}" height="${c.h}" result="specular_layer" preserveAspectRatio="none"/>
            <feComposite in="displaced_saturated" in2="specular_layer" operator="in" result="specular_saturated"/>
            <feComponentTransfer in="specular_layer" result="specular_faded"><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
            <feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation"/>
            <feBlend in="specular_faded" in2="withSaturation" mode="normal"/>
          </filter></defs></svg>
      </div>
    </div>`;
  const root = el.querySelector('.lg-root'), th = el.querySelector('.lg-thumb'), tr = el.querySelector('.lg-track'), fi = el.querySelector('.lg-fill');
  const clone = el.querySelector('.lg-clone'), ci = el.querySelector('.lg-clone-inner'), inner = el.querySelector('.lg-thumb-inner'), dmap = el.querySelector('.lg-dmap');

  // the pen's maths, unchanged
  const SurfaceEquations = { convex_squircle: x => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4) };
  class Spring {
    constructor(v, s = 300, d = 20) { this.value = v; this.target = v; this.velocity = 0; this.stiffness = s; this.damping = d; }
    setTarget(t) { this.target = t; }
    update(dt) { const f = (this.target - this.value) * this.stiffness, df = this.velocity * this.damping; this.velocity += (f - df) * dt; this.value += this.velocity * dt; return this.value; }
    isSettled() { return Math.abs(this.target - this.value) < .001 && Math.abs(this.velocity) < .001; }
  }
  function calculateDisplacementMap1D(gt, bw, sf, ri, s = 128) {
    const e = 1 / ri, r = [];
    for (let i = 0; i < s; i++) {
      const x = i / s, y = sf(x), dx = x < 1 ? .0001 : -.0001, d = (sf(Math.max(0, Math.min(1, x + dx))) - y) / dx;
      const m = Math.sqrt(d * d + 1), n = [-d / m, -1 / m], dt = n[1], k = 1 - e * e * (1 - dt * dt);
      if (k < 0) r.push(0); else { const rf = [-(e * dt + Math.sqrt(k)) * n[0], e - (e * dt + Math.sqrt(k)) * n[1]]; r.push(rf[0] * ((y * bw + gt) / rf[1])); }
    }
    return r;
  }
  function calculateDisplacementMap2D(cw, ch, ow, oh, rad, bw, md, pMap) {
    const img = new ImageData(cw, ch);
    for (let i = 0; i < img.data.length; i += 4) { img.data[i] = 128; img.data[i + 1] = 128; img.data[i + 3] = 255; }
    const rSq = rad * rad, rp1Sq = (rad + 1) ** 2, rmBwSq = Math.max(0, rad - bw) ** 2, wB = ow - rad * 2, hB = oh - rad * 2, oX = (cw - ow) / 2, oY = (ch - oh) / 2;
    for (let y1 = 0; y1 < oh; y1++) for (let x1 = 0; x1 < ow; x1++) {
      const idx = ((oY + y1) * cw + oX + x1) * 4;
      const x = x1 < rad ? x1 - rad : x1 >= ow - rad ? x1 - rad - wB : 0, y = y1 < rad ? y1 - rad : y1 >= oh - rad ? y1 - rad - hB : 0, dSq = x * x + y * y;
      if (dSq <= rp1Sq && dSq >= rmBwSq) {
        const dist = Math.sqrt(dSq), op = dSq < rSq ? 1 : 1 - (dist - rad) / (Math.sqrt(rp1Sq) - rad);
        const bIdx = Math.floor(Math.max(0, Math.min(1, (rad - dist) / bw)) * pMap.length), dVal = pMap[Math.max(0, Math.min(bIdx, pMap.length - 1))] || 0;
        const dX = md > 0 ? (-(dist > 0 ? x / dist : 0) * dVal) / md : 0, dY = md > 0 ? (-(dist > 0 ? y / dist : 0) * dVal) / md : 0;
        img.data[idx] = Math.max(0, Math.min(255, 128 + dX * 127 * op)); img.data[idx + 1] = Math.max(0, Math.min(255, 128 + dY * 127 * op));
      }
    }
    return img;
  }
  function calculateSpecularHighlight(ow, oh, rad, bw) {
    const img = new ImageData(ow, oh), sVec = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], rSq = rad * rad, rp1Sq = (rad + 1) ** 2, rmSSq = Math.max(0, (rad - 1.5) ** 2);
    for (let y1 = 0; y1 < oh; y1++) for (let x1 = 0; x1 < ow; x1++) {
      const x = x1 < rad ? x1 - rad : x1 >= ow - rad ? x1 - rad - (ow - rad * 2) : 0, y = y1 < rad ? y1 - rad : y1 >= oh - rad ? y1 - rad - (oh - rad * 2) : 0, dSq = x * x + y * y;
      if (dSq <= rp1Sq && dSq >= rmSSq) {
        const dist = Math.sqrt(dSq), op = dSq < rSq ? 1 : 1 - (dist - rad) / (Math.sqrt(rp1Sq) - rad);
        const dp = Math.abs((dist > 0 ? x / dist : 0) * sVec[0] + (dist > 0 ? -y / dist : 0) * sVec[1]), cf = dp * Math.sqrt(1 - (1 - Math.max(0, Math.min(1, (rad - dist) / 1.5))) ** 2), col = Math.min(255, 255 * cf), idx = (y1 * ow + x1) * 4;
        img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = col; img.data[idx + 3] = Math.min(255, col * cf * op);
      }
    }
    return img;
  }
  const imageDataToDataURL = img => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').putImageData(img, 0, 0); return cv.toDataURL(); };
  const useBackdropFilter = (() => { const t = document.createElement('div'); t.style.backdropFilter = 'url(#test)'; return !!window.chrome && t.style.backdropFilter.includes('url') && !/[?&]glass=copy/.test(location.search); })();      // ?glass=copy: the other browsers' path, for testing in Chrome

  const s = { val: 0, pd: false, md: 0 }; let curSc = c.sr;
  // the viewer's change: the thumb is glass at rest too (a faint milky body, REST_BO, and a gentler bend, REST_SR); pressing still
  // grows it into the full lens. The pen rested on a solid white pill (body 1) and only turned to glass while pressed.
  const REST_BO = .14, PRESS_BO = .06, REST_SR = .55, PRESS_SR = .9;
  const sp = { sc: new Spring(c.sr, 2000, 80), bo: new Spring(REST_BO, 2000, 80), sr: new Spring(REST_SR, 100, 10) };
  let af = null;
  const pc = calculateDisplacementMap1D(c.gt, c.bw, SurfaceEquations.convex_squircle, c.ri);
  s.md = Math.max(...pc.map(Math.abs));
  el.querySelector('.lg-disp').setAttribute('href', imageDataToDataURL(calculateDisplacementMap2D(c.w, c.h, c.w, c.h, c.r, c.bw, s.md || 1, pc)));
  el.querySelector('.lg-spec').setAttribute('href', imageDataToDataURL(calculateSpecularHighlight(c.w, c.h, c.r, c.bw)));
  // the lens filter is on whenever the thumb is glass (now always): it re-filters only the thumb's own small area as it moves
  const lensOn = on => { const f = on ? `url(#${uid})` : 'none'; if (useBackdropFilter) { inner.style.backdropFilter = inner.style.webkitBackdropFilter = f; } else clone.style.filter = f; };
  if (useBackdropFilter) el.classList.add('lg-backdrop'); let lens = false;

  const centre = v => HALF + (v / 100) * TRW;
  function upd() {      // the pen's upd(), with the clone lined up in the slider's own coordinates
    // the fill's edge sits under the glass, offset with progress: at 0 under its left rim, at 100 under its right, so the blue
    // creeps across the lens as the clip plays. Outside the glass the bar looks the same as with the edge at the thumb's centre.
    const cx = centre(s.val), fillPct = Math.max(0, Math.min(100, (s.val / 100 * TRW + (s.val / 100 - .5) * 2 * HALF * .9) / TRW * 100));
    fi.style.width = fillPct + '%';
    const tx = cx - c.w / 2;
    th.style.left = tx + 'px';
    if (!useBackdropFilter) {
      // the copy sits inside the scaled thumb, so it is magnified by 1 / scale about the thumb's centre: the bar inside the glass
      // keeps the bar's real height (unscaled, it showed at 0.6x at rest). The lens map stays on the thumb's own outline.
      ci.style.width = c.tw + 'px'; ci.style.height = c.h + 'px';
      ci.style.transformOrigin = `${tx + c.w / 2}px ${c.h / 2}px`; ci.style.transform = `translate(${-tx}px, 0px) scale(${1 / curSc})`;
      ci.style.setProperty('--track-top', `${(c.h - c.th) / 2}px`); ci.style.setProperty('--fill-width', fillPct.toString()); ci.style.setProperty('--track-left', HALF + 'px'); ci.style.setProperty('--track-w', TRW + 'px');
    }
    el.setAttribute('aria-valuenow', (s.val / 100).toFixed(3));
  }
  function loop() {      // the pen's loop()
    const dt = Math.min(.032, 1 / 60);
    sp.sc.setTarget(s.pd ? c.sd : c.sr); sp.bo.setTarget(s.pd ? PRESS_BO : REST_BO); sp.sr.setTarget(s.pd ? PRESS_SR : REST_SR);
    const sc = sp.sc.update(dt), bo = sp.bo.update(dt); curSc = sc; if (!useBackdropFilter) upd();
    th.style.transform = `scale(${sc})`; th.style.backgroundColor = `rgba(255,255,255,${bo})`;
    clone.style.opacity = 1 - bo; dmap.setAttribute('scale', s.md * sp.sr.update(dt));
    const want = bo < .995; if (want !== lens) { lens = want; lensOn(want); }
    if (!Object.values(sp).every(x => x.isSettled())) af = requestAnimationFrame(loop); else af = null;
  }
  // the pointer mapping, in screen pixels (× SCALE), over the thumb's travel
  const valAt = cx => { const x0 = tr.getBoundingClientRect().left, tw = TRW * SCALE; return Math.max(0, Math.min(100, ((Math.max(x0, Math.min(x0 + tw, cx)) - x0) / tw) * 100)); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); el.setPointerCapture(e.pointerId); s.pd = true; if (!af) af = requestAnimationFrame(loop);
    if (!th.contains(e.target)) { s.val = valAt(e.clientX); upd(); o.onInput && o.onInput(s.val / 100); }      // a press on the track jumps there
  });
  el.addEventListener('pointermove', e => { if (!s.pd) return; e.preventDefault(); s.val = valAt(e.clientX); upd(); o.onInput && o.onInput(s.val / 100); });
  const release = () => { if (!s.pd) return; s.pd = false; if (!af) af = requestAnimationFrame(loop); };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  el.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation();
    s.val = Math.max(0, Math.min(100, s.val + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 2))); upd(); o.onInput && o.onInput(s.val / 100);
  });
  // the bar's width follows its box (on small screens it takes whatever the buttons leave): re-measure and re-lay the track
  const fit = () => {
    const tw = Math.round(el.clientWidth / SCALE); if (!tw || tw === c.tw) return;
    c.tw = TW = tw; TRW = c.tw - 2 * HALF; root.style.width = c.tw + 'px'; tr.style.width = TRW + 'px'; upd();
  };
  if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
  upd(); af = requestAnimationFrame(loop);
  return { set(x) { if (s.pd) return; const v = Math.max(0, Math.min(100, x * 100)); if (Math.abs(v - s.val) < .01) return; s.val = v; upd(); }, dragging: () => s.pd };
}
