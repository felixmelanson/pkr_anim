'use strict';
/* js/data.js: the single source of every number that appears on screen.

   Paper: Lourenco et al., 2013, Cell Metabolism 18:831-843 (papers/lourenco-2013-cell-metab.pdf).
   PDF page N = journal page 830 + N.

   HOW THE BAR VALUES WERE OBTAINED
   The paper publishes bar charts only (means ± SEM); it gives no numeric values in the text. Every `mean` / `sem` below
   was therefore digitized from the figure: the page was rasterized at 300 dpi (pdftoppm -r 300), the y-axis tick rows
   and each bar's top edge and error-bar cap were located by pixel analysis, and pixel rows were converted to axis units
   by linear interpolation between the top and bottom ticks. Reading error is about ±1 px; `res` on each panel is what
   one pixel is worth in that panel's units. The script and its raw output are in .scratch/dig.py and
   .scratch/digitized.jsonl; overlay images that show the detected edges are in .scratch/dig/.
   So ALL means and SEMs here are digitized estimates. `approx: true` marks the ones that needed a manual read or
   where the automatic read was ambiguous; BUILD-NOTES.md lists them.

   n, tests, doses and significance marks are copied from the figure legends / Experimental Procedures (not digitized).
   Individual data points are NOT published. The n-dots drawn on bars show group size only; they carry no values.

   Classic script (global DATA), not an ES module: ES modules do not load from file://, and the viewer has no build step. */
const DATA = {
  PAPER: 'Lourenco et al., 2013, Cell Metab. 18:831-843',

  // Fig. 1 (PDF p. 3, journal p. 833)
  PPKR_CULTURE: {
    source: 'Lourenco 2013, Fig. 1G (p. 833)', unit: 'PKR-pThr451 immunofluorescence (a.u.)', n: 4, nUnit: 'independent cultures',
    test: "* p < 0.05, Student's t test", res: 0.011,
    bars: [{ label: 'Vehicle', mean: 1.03, sem: 0.06 }, { label: 'AβOs', mean: 2.67, sem: 0.53, star: '*' }],
  },
  EIF2A_PKRI: {
    source: 'Lourenco 2013, Fig. 1K, upper graph (p. 833)', unit: 'eIF2α-P immunofluorescence (a.u.)', n: 3, nUnit: 'independent cultures',
    test: '* p < 0.05, ANOVA + Bonferroni', res: 0.016,
    bars: [{ label: 'Vehicle', mean: 0.23, sem: null, approx: true, note: 'error bar too small to resolve' },
           { label: 'AβOs', mean: 2.07, sem: 0.90, star: '*' },
           { label: 'PKRi + AβOs', mean: 0.58, sem: 0.14 }],
  },

  // Fig. 2 (PDF p. 4, journal p. 834)
  PPKR_INFLIX: {
    source: 'Lourenco 2013, Fig. 2B (p. 834)', unit: 'PKR-pThr451 immunofluorescence (a.u.)', n: 4, nUnit: 'independent cultures',
    test: '** p < 0.01, ANOVA + Bonferroni', res: 0.011,
    bars: [{ label: 'Vehicle', mean: 1.02, sem: 0.11 }, { label: 'AβOs', mean: 2.03, sem: 0.05, star: '**' }, { label: 'Infliximab + AβOs', mean: 0.93, sem: 0.08 }],
  },
  EIF2A_INFLIX: {
    source: 'Lourenco 2013, Fig. 2D (p. 834)', unit: 'eIF2α-P immunofluorescence (a.u.)', n: 4, nUnit: 'independent cultures',
    test: '** p < 0.01, ANOVA + Bonferroni', res: 0.024,
    bars: [{ label: 'Vehicle', mean: 1.05, sem: null, approx: true, note: 'error bar too small to resolve' }, { label: 'AβOs', mean: 4.23, sem: 0.45, star: '**' },
           { label: 'JNKi + AβOs', mean: 1.28, sem: 0.32 }, { label: 'Infliximab + AβOs', mean: 1.33, sem: 0.45 }],
  },
  ABO_BINDING: {
    source: 'Lourenco 2013, Fig. 2G (p. 834)', unit: 'AβO binding to neurons (% of AβOs)', n: null, nUnit: 'not stated in the legend',
    test: 'no significance mark in the figure', res: 0.4,
    bars: [{ label: 'AβOs', mean: 101, sem: 4.5 }, { label: 'Infliximab + AβOs', mean: 89, sem: 9.7 }],
  },
  TNF_MEDIUM: {
    source: 'Lourenco 2013, Fig. 2H (p. 834)', unit: 'soluble TNF-α in conditioned medium (pg/mL)', n: 3, nUnit: 'independent experiments',
    test: "* p < 0.05, Student's t test", res: 0.2, approx: true, note: 'tick spacing in the raster is uneven by ~5 px, so values are good to about ±1 pg/mL',
    bars: [{ label: 'Vehicle', mean: 28.5, sem: 0.8 }, { label: 'AβOs', mean: 54.4, sem: 4.3, star: '*' }],
  },

  // Fig. 3 (PDF p. 5, journal p. 835)
  NOR_INFLIX: {
    source: 'Lourenco 2013, Fig. 3A (p. 835)', unit: 'exploration time (%)', n: '7-10', nDots: 7, nUnit: 'mice per group (dots show the minimum, 7)',
    test: '* p < 0.05 vs the 50% reference value', ref: 50, res: 0.41,
    groups: [{ label: 'Vehicle', old: 30.9, oldSem: 2.3, nov: 70.3, novSem: 2.0, star: '*' },
             { label: 'AβOs', old: 48.6, oldSem: 4.7, nov: 53.1, novSem: 4.7 },
             { label: 'AβOs + infliximab', old: 36.3, oldSem: 2.9, nov: 65.0, novSem: 2.7, star: '*' }],
  },
  NOR_TNFR1: {
    source: 'Lourenco 2013, Fig. 3B (p. 835)', unit: 'exploration time (%)', n: '9-10', nDots: 9, nUnit: 'mice per group (dots show the minimum, 9)',
    test: '* p < 0.05 vs the 50% reference value', ref: 50, res: 0.39,
    groups: [{ label: 'WT', sub: 'vehicle', old: 42.8, oldSem: 2.8, nov: 58.2, novSem: 3.0, star: '*' },
             { label: 'WT', sub: 'AβOs', old: 49.1, oldSem: 4.5, nov: 51.3, novSem: 2.8, approx: true, note: 'bar top sits on the dashed 50% line; read by hand' },
             { label: 'TNFR1−/−', sub: 'vehicle', old: 45.2, oldSem: 1.0, nov: 56.2, novSem: 1.0, star: '*' },
             { label: 'TNFR1−/−', sub: 'AβOs', old: 35.7, oldSem: 4.5, nov: 65.3, novSem: 4.3, star: '*' }],
  },
  FREEZE_TNFR1: {
    source: 'Lourenco 2013, Fig. 3C (p. 835)', unit: 'freezing (%)', n: '9-10', nDots: 9, nUnit: 'mice per group', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.39,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 72.9, sem: 2.9 }, { label: 'WT', sub: 'AβOs', mean: 50.3, sem: 4.5, star: '*' },
           { label: 'TNFR1−/−', sub: 'vehicle', mean: 72.9, sem: 4.5 }, { label: 'TNFR1−/−', sub: 'AβOs', mean: 77.2, sem: 6.6 }],
  },
  PPKR_TNFR1: {
    source: 'Lourenco 2013, Fig. 3D (p. 835)', unit: 'p-PKR / total PKR (a.u.)', n: 7, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.017,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 1.05, sem: 0.04 }, { label: 'WT', sub: 'AβOs', mean: 2.82, sem: 0.77, star: '*' },
           { label: 'TNFR1−/−', sub: 'vehicle', mean: 1.22, sem: 0.35 }, { label: 'TNFR1−/−', sub: 'AβOs', mean: 0.85, sem: 0.32 }],
  },
  EIF2A_TNFR1: {
    source: 'Lourenco 2013, Fig. 3E (p. 835)', unit: 'eIF2α-P / total eIF2α (a.u.)', n: 7, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.013,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 1.10, sem: 0.07 }, { label: 'WT', sub: 'AβOs', mean: 1.92, sem: 0.35, star: '*' },
           { label: 'TNFR1−/−', sub: 'vehicle', mean: 0.92, sem: 0.11 }, { label: 'TNFR1−/−', sub: 'AβOs', mean: 1.06, sem: 0.22 }],
  },
  SYNAPTIC_TNFR1: {
    source: 'Lourenco 2013, Fig. 3F (p. 835)', unit: 'protein / actin (a.u.)', n: 7, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.008,
    groups: [{ label: 'WT', sub: 'vehicle', syp: 1.01, sypSem: 0.12, psd: 1.08, psdSem: 0.14 }, { label: 'WT', sub: 'AβOs', syp: 0.64, sypSem: 0.03, psd: 0.56, psdSem: 0.12, star: '*' },
             { label: 'TNFR1−/−', sub: 'vehicle', syp: 1.13, sypSem: 0.16, psd: 1.20, psdSem: 0.20 }, { label: 'TNFR1−/−', sub: 'AβOs', syp: 1.16, sypSem: 0.18, psd: 1.32, psdSem: 0.09 }],
  },
  NOR_PKR: {
    source: 'Lourenco 2013, Fig. 3G (p. 835)', unit: 'exploration time (%)', n: '8-10', nDots: 8, nUnit: 'mice per group (dots show the minimum, 8)',
    test: '* p < 0.05 vs the 50% reference value', ref: 50, res: 0.39,
    groups: [{ label: 'WT', sub: 'vehicle', old: 37.8, oldSem: 3.3, nov: 63.8, novSem: 3.0, star: '*' },
             { label: 'WT', sub: 'AβOs', old: 53.9, oldSem: 3.7, nov: 47.6, novSem: 3.9, approx: true, note: 'the dashed 50% line overlaps this bar; top and cap read by hand from the pixel rows' },
             { label: 'PKR−/−', sub: 'vehicle', old: 34.3, oldSem: 3.3, nov: 67.3, novSem: 3.0, star: '*' },
             { label: 'PKR−/−', sub: 'AβOs', old: 33.9, oldSem: 3.9, nov: 68.1, novSem: 3.0, star: '*' }],
  },
  FREEZE_PKR: {
    source: 'Lourenco 2013, Fig. 3H (p. 835)', unit: 'freezing (%)', n: '9-10', nDots: 9, nUnit: 'mice per group', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.40,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 81.3, sem: 2.8 }, { label: 'WT', sub: 'AβOs', mean: 63.3, sem: 4.6, star: '*' },
           { label: 'PKR−/−', sub: 'vehicle', mean: 80.9, sem: 3.4 }, { label: 'PKR−/−', sub: 'AβOs', mean: 85.7, sem: 1.4 }],
  },
  EIF2A_PKR: {
    source: 'Lourenco 2013, Fig. 3I (p. 835)', unit: 'eIF2α-P / total eIF2α (a.u.)', n: 7, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.011,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 1.02, sem: 0.04 }, { label: 'WT', sub: 'AβOs', mean: 1.84, sem: 0.25, star: '*' },
           { label: 'PKR−/−', sub: 'vehicle', mean: 0.69, sem: 0.03 }, { label: 'PKR−/−', sub: 'AβOs', mean: 0.72, sem: 0.10 }],
  },

  // Fig. 4 (PDF p. 6, journal p. 836)
  NOR_SALUBRINAL: {
    source: 'Lourenco 2013, Fig. 4A (p. 836)', unit: 'exploration time (%)', n: 10, nDots: 10, nUnit: 'mice per group',
    test: '* p < 0.05 vs the 50% reference value', ref: 50, res: 0.36,
    groups: [{ label: 'Vehicle', old: 35.3, oldSem: 5.7, nov: 65.2, novSem: 5.7, star: '*' },
             { label: 'Salubrinal', old: 55.6, oldSem: 2.9, nov: 45.6, novSem: 2.5 }],
  },
  SYP_SALUBRINAL_MICE: {
    source: 'Lourenco 2013, Fig. 4C (p. 836)', unit: 'synaptophysin / actin (a.u.)', n: 7, nUnit: 'mice per group', test: "* p < 0.05, Student's t test", res: 0.006,
    bars: [{ label: 'Vehicle', mean: 1.00, sem: 0.08 }, { label: 'Salubrinal', mean: 0.79, sem: 0.02, star: '*' }],
  },
  PSD_SALUBRINAL_MICE: {
    source: 'Lourenco 2013, Fig. 4D (p. 836)', unit: 'PSD-95 / actin (a.u.)', n: 7, nUnit: 'mice per group', test: "* p < 0.05, Student's t test", res: 0.006,
    bars: [{ label: 'Vehicle', mean: 1.01, sem: 0.13 }, { label: 'Salubrinal', mean: 0.65, sem: 0.08, star: '*' }],
  },
  SYP_PUNCTA_SAL: {
    source: 'Lourenco 2013, Fig. 4F (p. 836)', unit: 'synaptophysin puncta (a.u.)', n: 4, nUnit: 'independent cultures', test: "* p < 0.05, Student's t test", res: 1.9,
    bars: [{ label: 'Vehicle', mean: 330, sem: 66 }, { label: 'Salubrinal', mean: 116, sem: 8, star: '*' }],
  },
  PSD_PUNCTA_SAL: {
    source: 'Lourenco 2013, Fig. 4G (p. 836)', unit: 'PSD-95 puncta (a.u.)', n: 4, nUnit: 'independent cultures', test: "* p < 0.05, Student's t test", res: 1.9,
    bars: [{ label: 'Vehicle', mean: 322, sem: 69 }, { label: 'Salubrinal', mean: 133, sem: 8, star: '*' }],
  },
  COLOC_PUNCTA_SAL: {
    source: 'Lourenco 2013, Fig. 4H (p. 836)', unit: 'colocalized puncta (a.u.)', n: 4, nUnit: 'independent cultures', test: "* p < 0.05, Student's t test", res: 0.95,
    bars: [{ label: 'Vehicle', mean: 153, sem: 23 }, { label: 'Salubrinal', mean: 54, sem: 2, star: '*' }],
  },

  // Fig. 5 (PDF p. 7, journal p. 837)
  IRS_TNFR1: {
    source: 'Lourenco 2013, Fig. 5A (p. 837)', unit: 'IRS-1pSer636 / total IRS-1 (a.u.)', n: 7, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.010,
    bars: [{ label: 'WT', sub: 'vehicle', mean: 1.02, sem: 0.12 }, { label: 'WT', sub: 'AβOs', mean: 2.01, sem: 0.26, star: '*' },
           { label: 'TNFR1−/−', sub: 'vehicle', mean: 1.46, sem: 0.06 }, { label: 'TNFR1−/−', sub: 'AβOs', mean: 1.47, sem: 0.25 }],
  },
  IRS_PKR: {
    source: 'Lourenco 2013, Fig. 5B (p. 837)', unit: 'IRS-1pSer636 / β-actin (a.u.)', n: 8, nUnit: 'mice per condition', test: '* p < 0.05, ANOVA + Bonferroni (bracket: WT vs PKR−/−)', res: 0.010,
    caveat: 'No AβO-induced rise was detected in WT 129/SvEv mice (text, p. 836); the significant difference is WT vs PKR−/−.',
    bars: [{ label: 'WT', sub: 'vehicle', mean: 2.51, sem: 0.13 }, { label: 'WT', sub: 'AβOs', mean: 2.42, sem: 0.29 },
           { label: 'PKR−/−', sub: 'vehicle', mean: 1.68, sem: 0.28 }, { label: 'PKR−/−', sub: 'AβOs', mean: 1.52, sem: 0.22 }],
  },
  IRS_THAPS: {
    source: 'Lourenco 2013, Fig. 5D (p. 837)', unit: 'IRS-1pSer636 immunofluorescence (a.u.)', n: 3, nUnit: 'independent experiments (80 dendrite segments each)', test: '* p < 0.05, ANOVA + Bonferroni', res: 0.014,
    bars: [{ label: 'Vehicle', mean: 1.03, sem: 0.23 }, { label: 'Thapsigargin', mean: 2.66, sem: 0.35, star: '*' }, { label: 'Thaps + 4-PBA', mean: 1.63, sem: 0.07 }],
  },
  IRS_SAL_CULTURE: {
    source: 'Lourenco 2013, Fig. 5F (p. 837)', unit: 'IRS-1pSer636 immunofluorescence (a.u.)', n: 3, nUnit: 'independent experiments', test: 'no significant difference', res: 0.007,
    bars: [{ label: 'Vehicle', mean: 1.28, sem: 0.06 }, { label: 'Salubrinal', mean: 1.24, sem: 0.05 }],
  },
  IRS_SAL_MICE: {
    source: 'Lourenco 2013, Fig. 5H (p. 837)', unit: 'IRS-1pSer636 / total IRS-1 (a.u.)', n: 7, nUnit: 'mice per condition', test: 'no significant difference', res: 0.007,
    bars: [{ label: 'Vehicle', mean: 1.27, sem: 0.16 }, { label: 'Salubrinal', mean: 1.28, sem: 0.13 }],
  },

  // Doses and conditions, copied from Experimental Procedures (p. 840) and the legends
  PARAMS: {
    abo: '500 nM AβOs, 3 h', cultures: 'rat hippocampal neurons, 18-21 DIV', icv: '10 pmol AβOs i.c.v.',
    inflix: 'infliximab 1 µg/mL, added 30 min before AβOs', inflixVivo: 'infliximab 20 µg/day i.p. × 7 d',
    pkri: 'PKR inhibitor 1 µM', sal: 'salubrinal 10 µM, 3 h', salVivo: 'salubrinal 1 mg/kg i.p. × 7 d',
    thaps: 'thapsigargin 1 µM, 3 h', pba: '4-PBA 1 mM',
  },
};

/* DERIVED (not a figure in the paper): the two-axis "dissociation" plot in scene 7.
   Each point is a pair of group means taken from two separate panels of the same manipulation, and the y value is
   divided by that experiment's own vehicle mean (fold of vehicle). Nothing is fitted and no new statistic is claimed.
     salubrinal: x = novel-object exploration %, Fig. 4A (n = 10); y = IRS-1pSer636 / total IRS-1, Fig. 5H (n = 7), Swiss mice
     AβOs (WT):  x = novel-object exploration %, Fig. 3B (n = 9-10); y = IRS-1pSer636 / total IRS-1, Fig. 5A (n = 7), C57BL/6 WT
   The memory and IRS-1 readouts need not come from the same animals; the paper does not say. */
DATA.DISSOCIATION = {
  source: 'derived from Lourenco 2013, Figs. 3B, 4A, 5A, 5H (group means; y = fold of own vehicle)', derived: true,
  series: [
    { key: 'sal', label: 'Salubrinal', from: { x: 65.2, y: 1.00 }, to: { x: 45.6, y: +(1.28 / 1.27).toFixed(2) }, xSem: [5.7, 2.5], ySem: [+(0.16 / 1.27).toFixed(2), +(0.13 / 1.27).toFixed(2)] },
    { key: 'abo', label: 'AβOs (WT)', from: { x: 58.2, y: 1.00 }, to: { x: 51.3, y: +(2.01 / 1.02).toFixed(2) }, xSem: [3.0, 2.8], ySem: [+(0.12 / 1.02).toFixed(2), +(0.26 / 1.02).toFixed(2)] },
  ],
};
if (typeof module !== 'undefined') module.exports = DATA;
