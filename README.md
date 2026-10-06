# Twisty Lab

An offline puzzle solver and learning playground. Open `index.html` in a current browser; all runtime styles and solver code are embedded. No server or account is required.

Choose a puzzle and **Solve My Puzzle**, then paint every sticker using the labeled net. Keep the same orientation when following the computed moves. For Pyraminx, each face label lists its top, left, and right vertices. **Show All Faces** reveals the complete playback net. Pyraminx supports both white and red color schemes: use four colors, nine stickers each.

| Puzzle | What the calculator solves |
| --- | --- |
| 3x3 | Legal scanned states using a two-phase solver |
| Pyraminx | Legal scanned states, including independent tips |
| 4x4 | Reduced cubes, including OLL/PLL parity, and budgeted short corrections |
| 5x5 | Reduced cubes, supported wing corrections, and budgeted short corrections |

General unreduced 4x4/5x5 solving is still unfinished. Such scans show **Reduction required** when a verified solution cannot be calculated. Color counts alone do not guarantee big-cube legality. The app checks cubie legality for 3x3/Pyraminx and verifies every calculated solution by replaying it internally.

**Learn Techniques** offers eight-stage 3x3 practice, reduction/parity examples, and Pyraminx examples. Each guided case starts from an inverse-generated setup; completing its algorithm restores the solved baseline. These are prepared demonstrations, not automatic recognition of a physical puzzle. Independent Study uses display-only masks for each selected puzzle. The Puzzle Coach supplies local rule-based explanations.

NEXT applies one move, BACK undoes it, and autoplay stops at completion. Use lesson buttons to switch lessons and Restart Case to reset a demonstration. Calculations run in a background worker and cancel when you leave the scanner or edit the scan.

## Development

Run the engine suite with Node 18 or newer:

```sh
node verify.js
```

For CSS changes and browser checks, use Node 22 or newer:

```sh
npm ci
npm run build:styles
npx playwright install chromium
npm run test:browser
```

On macOS, browser checks can use installed Google Chrome. Set `CHROME_PATH` to use a specific Chrome/Chromium executable. The test runner writes a mobile screenshot to the temporary directory; `SCREENSHOT_PATH` overrides it.

The checks cover standard cube-model agreement, random legal scrambles, impossible states, actual solved outcomes, tetrahedral turns, wide/inner layers, parity, lessons, masks, exact undo, offline workers, cancellation, and browser controls.

The embedded [cubejs 1.3.2](https://github.com/ldez/cubejs) model and two-phase solver are MIT licensed by Petri Lehtinen and Ludovic Fernandez; their full license is preserved in `index.html`. Tailwind CSS 4.3.0 is compiled into the HTML. Development tooling is not needed to run the app.
