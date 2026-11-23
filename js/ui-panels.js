'use strict';
/* Footer links and their frosted-glass panels over the animation: Get Code, Custom Icons (icons.js), References.
   While a panel is open the stage is paused and not redrawn (STAGE_FROZEN in app.js), so the glass blurs a still picture and
   only the panel itself costs anything; closing it resumes playback if it was playing. Escape, the × or a click outside closes. */
(function () {
  const ov = document.getElementById('overlay'), panels = [...ov.querySelectorAll('.panel')];
  let openName = null, resumeOnClose = false;

  function show(name) {
    if (openName === name) return; if (openName) hide(true);
    resumeOnClose = !paused; if (!paused) setPaused(true);
    STAGE_FROZEN = true; UI_MODAL = true; openName = name;
    ov.hidden = false; for (const p of panels) p.hidden = p.dataset.name !== name;
    if (name === 'icons') iconsOpen(); if (name === 'refs') refsBuild();
    const p = panels.find(q => q.dataset.name === name); p.querySelector('.panel-close').focus({ preventScroll: true });
  }
  function hide(swap = false) {
    if (!openName) return; if (openName === 'icons') iconsClose();
    for (const p of panels) p.hidden = true; ov.hidden = true; openName = null;
    if (swap) return;
    STAGE_FROZEN = false; UI_MODAL = false; if (resumeOnClose) setPaused(false);
  }
  document.querySelectorAll('#credits [data-panel]').forEach(b => b.addEventListener('click', () => show(b.dataset.panel)));
  ov.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => hide()));
  ov.addEventListener('pointerdown', e => { if (e.target === ov) hide(); });
  addEventListener('keydown', e => {
    if (!openName || e.key !== 'Escape') return;
    e.preventDefault(); if (openName === 'icons' && iconDetail >= 0) iconsBack(); else hide();
  });

  /* ---------- Custom Icons ---------- */
  const ip = ov.querySelector('.panel-icons'), grid = ip.querySelector('.icons-grid'), listView = ip.querySelector('.icons-list'), detailView = ip.querySelector('.icons-detail');
  const big = ip.querySelector('.icons-big'), stage = ip.querySelector('.icons-stage'), playBtn = ip.querySelector('.icons-play'), playLab = ip.querySelector('.icons-play-label');
  const imgBtn = ip.querySelector('.icons-copy-img'), codeBtn = ip.querySelector('.icons-copy-code'), codeEl = ip.querySelector('.icons-code code');
  const dpr = () => Math.min(2, devicePixelRatio || 1);
  let built = false, tiles = [], paintQ = [], iconDetail = -1, playing = false, raf = 0, t0 = 0, tNow = 0;
  function iconsOpen() {
    if (!built) {
      built = true;
      ICONS.forEach((it, i) => {
        const li = document.createElement('li'), b = document.createElement('button'), cv = document.createElement('canvas'), lab = document.createElement('span');
        b.type = 'button'; cv.width = cv.height = Math.round(150 * dpr()); lab.textContent = it.name;
        b.append(cv, lab); b.addEventListener('click', () => iconsShow(i)); li.appendChild(b); grid.appendChild(li); tiles.push(cv);
      });
      paintQ = ICONS.map((_, i) => i);
    }
    if (paintQ.length) requestAnimationFrame(paintSome);
  }
  // thumbnails a couple at a time, so the panel appears at once and fills in
  function paintSome() {
    if (openName !== 'icons') return;
    const t1 = performance.now();
    while (paintQ.length && performance.now() - t1 < 24) { const i = paintQ.shift(); paintIcon(tiles[i], ICONS[i], 0, false); }
    if (paintQ.length) requestAnimationFrame(paintSome);
  }
  // the viewer is a square (CSS); the canvas matches it pixel for pixel, so nothing is ever stretched
  function sizeBig() {
    // a square in CSS pixels that fits the box, centred: whatever shape the box ends up (narrow panels, Firefox), the icon is never squashed
    const body = stage.parentElement.getBoundingClientRect(), side = Math.max(120, Math.floor(Math.min(body.height, body.width * .5))), n = Math.min(2600, Math.round(side * dpr()));
    stage.style.width = stage.style.height = side + 'px';      // the frame is a square too (CSS aspect-ratio gave way to max-width on wide panels)
    big.style.width = big.style.height = side + 'px'; if (big.width !== n || big.height !== n) { big.width = big.height = n; }
  }
  const drawBig = () => { if (iconDetail >= 0) { sizeBig(); paintIcon(big, ICONS[iconDetail], tNow, playing, 1.1); } };
  function iconsShow(i) {
    iconDetail = i; tNow = 0; ip.querySelector('.icons-name').textContent = ICONS[i].name;
    codeEl.innerHTML = highlightJS(iconCode(ICONS[i])); codeEl.parentElement.scrollTop = 0;
    listView.hidden = true; detailView.hidden = false; setPlaying(false); requestAnimationFrame(drawBig);
  }
  function iconsBack() { setPlaying(false); iconDetail = -1; detailView.hidden = true; listView.hidden = false; }
  function iconsClose() { setPlaying(false); iconDetail = -1; detailView.hidden = true; listView.hidden = false; }
  function loop(now) { if (!playing) return; tNow = (now - t0) / 1000; drawBig(); raf = requestAnimationFrame(loop); }
  function setPlaying(p) {
    playing = p; cancelAnimationFrame(raf);
    playBtn.querySelector('.icon-play').style.display = p ? 'none' : ''; playBtn.querySelector('.icon-pause').style.display = p ? '' : 'none';
    playLab.textContent = p ? 'Pause' : 'Play';
    if (p) { t0 = performance.now() - tNow * 1000; raf = requestAnimationFrame(loop); } else if (iconDetail >= 0) drawBig();
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  ip.querySelector('.icons-back').addEventListener('click', iconsBack);
  addEventListener('resize', () => { if (openName === 'icons' && iconDetail >= 0 && !playing) drawBig(); });
  // Copy Image: the large view as a PNG with a transparent background (a download where the clipboard is not allowed)
  const flash = (btn, txt) => { const lab = btn.querySelector('span'), was = lab.textContent; lab.textContent = txt; btn.classList.add('done'); setTimeout(() => { lab.textContent = was; btn.classList.remove('done'); }, 1300); };
  imgBtn.addEventListener('click', () => {
    if (iconDetail < 0) return; const name = ICONS[iconDetail].id + '.png';
    big.toBlob(async blob => {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); flash(imgBtn, 'Copied'); }
      catch (e) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); flash(imgBtn, 'Saved'); }
    }, 'image/png');
  });
  codeBtn.addEventListener('click', async () => {
    if (iconDetail < 0) return;
    try { await navigator.clipboard.writeText(iconCode(ICONS[iconDetail])); flash(codeBtn, 'Copied'); } catch (e) { flash(codeBtn, 'Select and copy'); }
  });

  /* ---------- References (APA style; authors shortened to the first three and the last; DOIs checked against PubMed) ---------- */
  const REFS = [
    ['Lourenco, M. V., Clarke, J. R., Frozza, R. L., … De Felice, F. G.', 2013, 'TNF-α mediates PKR-dependent memory impairment and brain IRS-1 inhibition induced by Alzheimer’s β-amyloid oligomers in mice and monkeys.', 'Cell Metabolism, 18(6), 831–843.', '10.1016/j.cmet.2013.11.002', 'The paper this animation is about. All data shown are redrawn from it.'],
    ['Bomfim, T. R., Forny-Germano, L., Sathler, L. B., … De Felice, F. G.', 2012, 'An anti-diabetes agent protects the mouse brain from defective insulin signaling caused by Alzheimer’s disease-associated Aβ oligomers.', 'Journal of Clinical Investigation, 122(4), 1339–1353.', '10.1172/JCI57256'],
    ['Bullido, M. J., Martínez-García, A., Tenorio, R., … Valdivieso, F.', 2008, 'Double stranded RNA activated EIF2 alpha kinase (EIF2AK2; PKR) is associated with Alzheimer’s disease.', 'Neurobiology of Aging, 29(8), 1160–1166.', '10.1016/j.neurobiolaging.2007.02.023'],
    ['De Felice, F. G., Vieira, M. N. N., Bomfim, T. R., … Klein, W. L.', 2009, 'Protection of synapses against Alzheimer’s-linked toxins: Insulin signaling prevents the pathogenic binding of Aβ oligomers.', 'Proceedings of the National Academy of Sciences, 106(6), 1971–1976.', '10.1073/pnas.0809158106'],
    ['Hoozemans, J. J. M., van Haastert, E. S., Nijholt, D. A. T., … Scheper, W.', 2009, 'The unfolded protein response is activated in pretangle neurons in Alzheimer’s disease hippocampus.', 'American Journal of Pathology, 174(4), 1241–1251.', '10.2353/ajpath.2009.080814'],
    ['Lacor, P. N., Buniel, M. C., Furlow, P. W., … Klein, W. L.', 2007, 'Aβ oligomer-induced aberrations in synapse composition, shape, and density provide a molecular basis for loss of connectivity in Alzheimer’s disease.', 'Journal of Neuroscience, 27(4), 796–807.', '10.1523/JNEUROSCI.3501-06.2007'],
    ['Liddelow, S. A., Guttenplan, K. A., Clarke, L. E., … Barres, B. A.', 2017, 'Neurotoxic reactive astrocytes are induced by activated microglia.', 'Nature, 541(7638), 481–487.', '10.1038/nature21029'],
  ];
  let refsDone = false;
  function refsBuild() {
    if (refsDone) return; refsDone = true;
    const ol = ov.querySelector('.refs-list');
    for (const [au, yr, title, src, doi, note] of REFS) {
      const li = document.createElement('li'), url = 'https://doi.org/' + doi;
      li.innerHTML = `${au} (${yr}). <span class="ref-title">${title}</span> <em>${src.split(',')[0]}</em>${src.slice(src.indexOf(','))} <a href="${url}" target="_blank" rel="noopener">${url}</a>${note ? `<br><span style="color:#8a97a4">${note}</span>` : ''}`;
      ol.appendChild(li);
    }
  }
})();
