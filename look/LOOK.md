# Look settings

Paste the **Copy JSON** output from the elements page (`gallery.html`) here (or into any other `.md` file in this folder;
LOOK.md is read first, then the others alphabetically), one paste per block, newest at the bottom.
You don't need to tidy anything: every JSON block in this file is read in order, and a later block wins where
two of them set the same thing. Notes and headings between blocks are ignored, so date them or label them if you like.

`node tools/build-look.mjs` turns this file into `js/look.js`, which the animation, the elements page and the video
renderer load. The renderer runs it on its own before every export, so you only need to run it by hand to see a new
paste in the browser (then reload). Anything you change in the browser afterwards still shows on top while you
experiment; paste a new Copy JSON here to keep it.

Textures can be written as a name (`"tex": "GE rim only +"`) or as the number Copy JSON gives; numbers are converted
to names when this file is built.

## 2026-11-19

```json
{
  "palette": {
    "dark": {
      "ui.casp": "#ff2300",
      "tp.astro.rim": "#318e7e",
      "tp.astro.body": "#133533",
      "tp.astro.fil": "#3ac8a7",
      "tp.astro.nuc": "#081819",
      "tp.micro.rim": "#7bc128",
      "tp.micro.body": "#204210",
      "tp.micro.fil": "#9cff27",
      "tp.micro.nuc": "#0d1e06",
      "a1.rim": "#ce3b26",
      "a1.body": "#482322",
      "a1.fil": "#dd6446",
      "a1.nuc": "#200f0f"
    }
  },
  "elements": {
    "astro": {
      "tex": 4,
      "shiftBase": {
        "tp.astro.rim": "#36f0d0",
        "tp.astro.body": "#086661",
        "tp.astro.fil": "#8effe5",
        "tp.astro.nuc": "#022d30"
      },
      "shift": {
        "h": 0,
        "s": -44,
        "l": -35
      }
    },
    "astro-a1": {
      "tex": 3,
      "shiftBase": {
        "a1.rim": "#ff9078",
        "a1.body": "#7c2e28",
        "a1.fil": "#ffd0c0",
        "a1.nuc": "#381311",
        "tp.astro.rim": "#009f83",
        "tp.astro.body": "#003b38",
        "tp.astro.fil": "#00d6a5",
        "tp.astro.nuc": "#00191b"
      },
      "shift": {
        "h": -3,
        "s": -31,
        "l": -35
      }
    },
    "neuron-lit": {
      "tex": 4
    },
    "micro": {
      "tex": 2
    },
    "micro-act": {
      "tex": 2,
      "shiftBase": {
        "tp.micro.rim": "#7ee4b0",
        "tp.micro.body": "#18644e",
        "tp.micro.fil": "#beffde",
        "tp.micro.nuc": "#092e25"
      },
      "shift": {
        "h": -62,
        "s": 0,
        "l": -34
      }
    },
    "rgc": {
      "tex": 3
    },
    "neuron-dying": {
      "tex": 4
    },
    "oligo": {
      "tex": 4
    },
    "tnf": {
      "tex": 4
    },
    "tnfb": {},
    "phos": {},
    "lipid": {},
    "jnk": {},
    "er": {},
    "ribo": {
      "tex": 4
    },
    "abo": {},
    "ab": {
      "tex": 4
    },
    "il1": {
      "tex": 4
    },
    "c1q": {
      "tex": 6
    },
    "neuron-abo": {
      "tex": 3
    },
    "fl-red": {},
    "neuron": {
      "tex": 4
    }
  }
}
```
