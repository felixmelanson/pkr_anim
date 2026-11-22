'use strict';
// Temporary scene 1/2 placement controls. Values are world-space offsets and are intentionally not part of scene state.
(function () {
  const root = document.getElementById('bridgeDebugFields');
  if (!root || typeof BR_DEBUG === 'undefined') return;
  const groups = [
    ['Components', 'component', [['microglia', 'Microglia'], ['astrocyte', 'Astrocyte'], ['il1', 'IL-1α'], ['tnf', 'TNF-α'], ['c1q', 'C1q']]],
    ['Labels', 'label', [['microglia', 'Microglia label'], ['astrocyte', 'Astrocyte label'], ['il1', 'IL-1α label'], ['tnf', 'TNF-α label'], ['c1q', 'C1q label'], ['retinal', 'Retinal ganglion label'], ['lipid', 'Saturated lipid label'], ['pyramidal', 'Pyramidal neurons label'], ['hippocampus', 'Hippocampus label']]],
  ];
  const inputs = [];
  for (const [title, section, items] of groups) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'bridge-debug-group';
    fieldset.innerHTML = `<legend>${title}</legend><div class="bridge-debug-row bridge-debug-axis"><span></span><span>X</span><span>Y</span></div>`;
    for (const [key, label] of items) {
      const row = document.createElement('div');
      row.className = 'bridge-debug-row';
      row.innerHTML = `<label>${label}</label><input type="number" step="1" value="${BR_DEBUG[section][key][0]}" aria-label="${label} X offset"><input type="number" step="1" value="${BR_DEBUG[section][key][1]}" aria-label="${label} Y offset">`;
      const xy = [...row.querySelectorAll('input')];
      xy.forEach((input, axis) => {
        input.addEventListener('input', () => { BR_DEBUG[section][key][axis] = Number(input.value) || 0; });
        inputs.push({ input, section, key, axis });
      });
      fieldset.appendChild(row);
    }
    root.appendChild(fieldset);
  }
  const reset = () => {
    for (const { input, section, key, axis } of inputs) {
      const value = BR_DEBUG_DEFAULTS[section][key][axis];
      BR_DEBUG[section][key][axis] = value;
      input.value = value;
    }
  };
  document.getElementById('bridgeDebugReset').addEventListener('click', reset);
  document.getElementById('bridgeDebugCopy').addEventListener('click', async event => {
    const text = JSON.stringify(BR_DEBUG, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      event.currentTarget.textContent = 'Copied';
      setTimeout(() => { event.currentTarget.textContent = 'Copy values'; }, 1000);
    } catch (error) {
      event.currentTarget.textContent = 'Copy failed';
      console.error('Could not copy debug positions.', error);
    }
  });
})();
