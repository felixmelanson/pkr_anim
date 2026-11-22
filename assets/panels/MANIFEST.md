# Receipt panels

Cropped from `papers/lourenco-2013-cell-metab.pdf` rasterized at 300 dpi (`pdftoppm -r 300`, page PNG 2513 x 3263 px) into `assets/pages/`.
Crop box = left, top, right, bottom in 300-dpi page pixels, before the whitespace trim. Journal page = printed page number.

| file | figure / panel | PDF page | journal page | crop box (px @300 dpi) | final size |
|---|---|---|---|---|---|
| `fig1h.png` | Fig. 1H | 3 | 833 | 1032, 985, 1816, 1424 | 784 x 439 |
| `fig2h.png` | Fig. 2H | 4 | 834 | 1370, 1300, 1605, 1746 | 232 x 434 |
| `fig2f-g.png` | Fig. 2F-G | 4 | 834 | 667, 1223, 1360, 1783 | 640 x 556 |
| `fig4a.png` | Fig. 4A | 6 | 836 | 245, 419, 550, 777 | 295 x 355 |
| `fig5e-h.png` | Fig. 5E-H | 7 | 837 | 214, 1471, 1210, 2165 | 982 x 682 |
| `fig5c-d.png` | Fig. 5C-D | 7 | 837 | 214, 1052, 1578, 1478 | 1200 x 375 |
| `fig7.png` | Fig. 7 | 10 | 840 | 372, 402, 1126, 2037 | 722 x 1613 |

Trim: bounding box of non-white pixels plus a 14 px margin; panels wider than 1200 px are downscaled to 1200 px (Lanczos).
These crops are the only raw figure content used in the animation; they are embedded as data URIs in `js/core/assets.js` by `tools/embed-assets.mjs`.
Source: Lourenco et al., 2013, Cell Metabolism 18:831-843. Copyright 2013 Elsevier Inc. Used here for a course presentation, each with its on-screen citation.
