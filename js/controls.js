'use strict';
// On-screen control bar: previous / play-pause / next, the liquid-glass scrub bar (scrub.js), the step counter, replay and
// fullscreen. Connects the buttons in index.html to the playback functions in app.js. Dark only (no theme toggle).
(function () {
  const scrubMax = () => STEPS[step].dur || 30;   // seconds: the bar's end is the clip's last frame
  const $ = id => document.getElementById(id);
  const el = { prev: $('ctlPrev'), play: $('ctlPlay'), next: $('ctlNext'), replay: $('ctlReplay'), full: $('ctlFull'), auto: $('ctlAuto'), stepLabel: $('stepLabel') };

  const scrub = LiquidScrub($('ctlScrub'), { onInput: v => scrubTo(v * scrubMax()) });

  const refreshStepLabel = () => { el.stepLabel.textContent = `${step + 1} / ${STEPS.length}`; };
  function refreshPlayIcon() {
    el.play.querySelector('.icon-play').style.display = paused ? '' : 'none';
    el.play.querySelector('.icon-pause').style.display = paused ? 'none' : '';
    el.play.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }
  function refreshFullIcon() {
    const fs = !!document.fullscreenElement;
    el.full.querySelector('.icon-full').style.display = fs ? 'none' : '';
    el.full.querySelector('.icon-exit').style.display = fs ? '' : 'none';
    el.full.setAttribute('aria-label', fs ? 'Exit full screen' : 'Full screen');
  }

  // app.js calls these hooks on state changes, whatever caused them (button, key, URL hash)
  onStepChange = () => { refreshStepLabel(); scrub.set(0); };
  onPlayStateChange = refreshPlayIcon;

  el.prev.addEventListener('click', () => go(step - 1));
  el.next.addEventListener('click', () => go(step + 1));
  el.play.addEventListener('click', () => setPaused(!paused));
  el.replay.addEventListener('click', () => {
    stepStart = performance.now(); prevStep = step; pauseT = 0; scrub.set(0);
    if (paused) { pauseGT = performance.now() / 1000; render(step, 0, pauseGT); }
  });
  el.full.addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  document.addEventListener('fullscreenchange', refreshFullIcon);

  // autoplay: at the end of a clip, go straight on to the next (the next clip is preloaded and opens on this one's last frame, so
  // it plays as one film). Off by default; the choice is remembered in this browser. A toggles it.
  let auto = false; try { auto = localStorage.getItem('pkr-autoplay') === '1'; } catch (e) {}
  function setAuto(v) {
    auto = !!v; try { localStorage.setItem('pkr-autoplay', auto ? '1' : '0'); } catch (e) {}
    el.auto.classList.toggle('on', auto); el.auto.setAttribute('aria-pressed', auto); el.auto.setAttribute('aria-label', 'Autoplay: ' + (auto ? 'on' : 'off'));
  }
  el.auto.addEventListener('click', () => setAuto(!auto));
  // a clicked button lets go of focus: no focus ring after a click, and Space (next step) never re-presses the last button clicked
  document.querySelectorAll('#controls button').forEach(b => b.addEventListener('pointerup', () => setTimeout(() => b.blur())));
  addEventListener('keydown', e => { if (!UI_MODAL && (e.key === 'a' || e.key === 'A')) setAuto(!auto); });
  setAuto(auto);

  // the scrub head follows playback (one cheap style update a frame)
  (function follow() {
    const t = paused ? pauseT : (performance.now() - stepStart) / 1000;
    scrub.set(Math.min(1, t / scrubMax()));
    if (auto && !paused && !UI_MODAL && !scrub.dragging() && step < STEPS.length - 1 && t >= scrubMax() - .001) go(step + 1);
    requestAnimationFrame(follow);
  })();

  // fullscreen: the bar fades out while the pointer rests
  let idle = 0; const wake = () => { document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => { if (document.fullscreenElement && !scrub.dragging()) document.body.classList.add('idle'); }, 2200); };
  addEventListener('pointermove', wake); addEventListener('keydown', wake);

  // a click on the stage advances
  cv.addEventListener('click', () => go(step + 1));

  refreshStepLabel(); refreshPlayIcon(); refreshFullIcon();
})();
