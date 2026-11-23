'use strict';
/* The site plays the rendered clips (tools/render-test.mjs --web) instead of drawing every frame live: the same pictures, but the
   browser only decodes video, so it runs smoothly everywhere and scrubbing is a seek.
   One clip per step, in two <video> elements: the next step's clip loads in the hidden one, and since each clip opens on the
   previous clip's last frame, the swap is invisible. Each step still plays once and holds its last frame until you go on.
   4K when the stage has the pixels for it, 1080p otherwise or once the browser reports dropped frames.
   Live drawing is still there: ?live=1, in render mode, or automatically if a clip fails to load. */
const VIDEO_BASE = window.VIDEO_BASE || 'videos/';
const CLIPS = ['S1', 'S2', 'S3', 'S3b', 'S4A', 'S4B', 'S4C', 'S5', 'S6A', 'S6B', 'S6C', 'S7', 'S8', 'S9A', 'S9B', 'S10', 'S11', 'S12A', 'S12B', 'S13',
  'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20'];
let VIDEO_ON = !RENDER_MODE && QS.get('live') !== '1' && CLIPS.length === STEPS.length;
(function () {
  if (!VIDEO_ON) return;
  const box = document.createElement('div'); box.id = 'vids'; cv.after(box);
  const mk = () => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true; box.appendChild(v); return v; };
  let cur = mk(), nxt = mk(), curStep = -1, nxtStep = -1;
  cur.style.visibility = 'visible'; nxt.style.visibility = 'hidden';

  // 4K needs a stage at least ~2200 device pixels wide to be worth it; dropped frames send the rest of the visit to 1080p
  let low = QS.get('q') === '1080';
  const quality = () => low || (QS.get('q') !== '4k' && parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-w')) * (devicePixelRatio || 1) < 2200) ? '1080' : '4k';
  const src = k => `${VIDEO_BASE}${CLIPS[k]}-${quality()}.mp4`;
  const load = (v, k) => { v.src = src(k); v.load(); };

  function fallBack() {      // a clip did not load: draw live from here on, as before
    if (!VIDEO_ON) return; VIDEO_ON = false; box.remove(); PAUSE_KEY = '';
    stepStart = performance.now() - (pauseT || 0) * 1000;
  }
  for (const v of [cur, nxt]) v.addEventListener('error', () => { if (v === cur) fallBack(); else nxtStep = -1; });

  const preload = () => { const k = curStep + 1; if (k < STEPS.length && nxtStep !== k) { nxtStep = k; load(nxt, k); } };
  function show(k, play) {
    if (k === curStep) return;
    if (k === nxtStep && nxt.readyState >= 2) {      // preloaded: swap now (its first frame is on screen already)
      [cur, nxt] = [nxt, cur]; cur.currentTime = 0;
      cur.style.visibility = 'visible'; nxt.style.visibility = 'hidden'; nxt.pause();
    } else { nxt.pause(); nxt.style.visibility = 'hidden'; load(cur, k); }
    curStep = k; nxtStep = -1;
    if (play) cur.play().catch(() => {});
    preload();
  }
  // the scrub bar's range is the step's dur (+1 s): use the clip's own length
  for (const v of [cur, nxt]) v.addEventListener('loadedmetadata', () => { if (v === cur && curStep >= 0) STEPS[curStep].dur = v.duration; });

  // seeks one at a time: a new position waits until the last seek has landed, so a fast drag never queues up work
  let pending = null;
  const seek = t => { t = Math.min(Math.max(0, t), (cur.duration || 1e9) - .001); if (cur.seeking) { pending = t; return; } cur.currentTime = t; };
  for (const v of [cur, nxt]) v.addEventListener('seeked', () => { if (v === cur && pending != null) { const t = pending; pending = null; cur.currentTime = t; } });

  // app.js keeps the step, play / pause and the scrub position; these wrappers drive the video from them
  const go0 = go, setPaused0 = setPaused, scrubTo0 = scrubTo;
  go = k => { go0(k); if (VIDEO_ON) show(step, !paused); };
  setPaused = p => { setPaused0(p); if (!VIDEO_ON) return; if (paused) cur.pause(); else if (!cur.ended) cur.play().catch(() => {}); };
  scrubTo = t => { scrubTo0(t); if (VIDEO_ON) seek(t); };
  // replay (button or R): restart the clip
  const replay = e => { if (!VIDEO_ON) return; e.stopImmediatePropagation(); e.preventDefault(); cur.currentTime = 0; pauseT = 0; if (!paused) cur.play().catch(() => {}); };
  document.getElementById('ctlReplay').parentNode.addEventListener('click', e => { if (e.target.closest('#ctlReplay')) replay(e); }, true);
  addEventListener('keydown', e => { if (!UI_MODAL && (e.key === 'r' || e.key === 'R')) replay(e); }, true);

  // keep app.js's clock on the video's, so the scrub head (controls.js) follows the clip
  let qT = 0, qD = 0, qN = 0, qV = null;
  (function sync(now) {
    if (VIDEO_ON) {
      pauseT = cur.currentTime; if (!paused) stepStart = now - cur.currentTime * 1000;
      if (!low && !paused && !cur.paused && now - qT > 2000 && cur.getVideoPlaybackQuality) {      // over 10 % of frames dropped in the last 2 s: 1080p from the next clip on
        const q = cur.getVideoPlaybackQuality(), d = q.droppedVideoFrames - qD, n = q.totalVideoFrames - qN;
        if (qT && qV === cur && n > 30 && d / n > .1) low = true;
        qT = now; qD = q.droppedVideoFrames; qN = q.totalVideoFrames; qV = cur;
      }
      requestAnimationFrame(sync);
    }
  })(0);

  IMG_READY.then(() => show(step, !paused));
})();
