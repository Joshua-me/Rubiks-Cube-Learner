# Twisty Lab

An offline puzzle solver and learning playground. Open `index.html` in a current browser; all runtime styles and solver code are embedded. No server or account is required.

Choose a puzzle and **Solve My Puzzle**, then paint every sticker using the labeled net. Keep the same orientation when following the computed moves. For Pyraminx, each face label lists its top, left, and right vertices. **Show All Faces** reveals the complete playback net. Pyraminx supports both white and red color schemes: use four colors, nine stickers each.

| Puzzle | What the calculator solves |
| --- | --- |
| 2x2 | Legal corner states, including odd permutations |
| 3x3 | Legal scanned states using a two-phase solver |
| Pyraminx | Legal scanned states, including independent tips |
| 4x4 | Legal scanned states, including centers, wing pairing, and OLL/PLL parity |
| 5x5 | Legal scanned states, including both center orbits and wing-to-middle-edge pairing |

Big-cube reduction uses pure three-piece cycles generated from small, embedded orbit tables. It handles fully scrambled states without external lookup files. These general solutions can contain hundreds of moves; they prioritize correctness over a short solution. The scanner checks piece identity, orientation, parity, and center-orbit counts as appropriate for each puzzle. Every solution is replayed internally before being displayed.

**Learn Techniques** offers CubeHead’s eight-stage 3x3 practice, J Perm’s 4x4 Yau and 5x5 reduction stages, two Pyraminx video references, and J Perm’s three-stage 2x2 practice. Each turn demonstration starts from an inverse-generated setup; inspection chapters show a prepared case. Completing a turn demonstration restores its solved baseline. These are prepared demonstrations, not automatic recognition of a physical puzzle. Independent Study uses display-only masks for each selected puzzle. The Puzzle Coach supplies local rule-based explanations.

NEXT applies one move, BACK undoes it, and autoplay stops at completion. Use lesson buttons to switch lessons and Restart Case to reset a demonstration. Long solutions show the current phase, move progress, and a compact window of notation; expand Entire Solution to inspect all moves. Show Solved Result executes the remaining sequence instantly, preserving BACK history. Restart Playback restores your scan. Calculations run in a background worker and cancel when you leave the scanner or edit the scan.

## Learning videos

- [CubeHead — 3x3 beginner tutorial (2026 title)](https://www.youtube.com/watch?v=PW2J8IblczM)
- [J Perm — full 4x4 Yau tutorial](https://www.youtube.com/watch?v=KWOZHbDdOeo)
- [J Perm — 5x5 beginner reduction tutorial](https://www.youtube.com/watch?v=d1I-jJlVwB4)
- [NOBLE CUBES — four-minute Pyraminx tutorial](https://www.youtube.com/watch?v=pHBj8hixTfE)
- [ParadoxCubing — EASY Beginner Pyraminx tutorial](https://www.youtube.com/watch?v=sCJcd6FKWAc)
- [J Perm — 2x2 beginner tutorial](https://www.youtube.com/watch?v=GANnG5a19kg)

The learning screens link these videos and confirmed chapters. Companion examples are prepared for the app, and calculation mode uses the verified solving engines. The videos require a connection when opened; scanning, solving, and practice remain offline.

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

The checks cover 40 long 2x2 scrambles and legal odd corner permutations, named tutorial/chapter links, whole-cube rotations, standard cube-model agreement, random legal scrambles, impossible states, actual solved outcomes, tetrahedral turns, wide/inner layers, parity, all 20,240 directed three-cycles, 80 long mixed-layer 4x4/5x5 scrambles, alternate color schemes, lessons, masks, exact undo/restart, offline workers, cancellation, and browser controls.

The embedded [cubejs 1.3.2](https://github.com/ldez/cubejs) model and two-phase solver are MIT licensed by Petri Lehtinen and Ludovic Fernandez; their full license is preserved in `index.html`. Tailwind CSS 4.3.0 is compiled into the HTML. Development tooling is not needed to run the app.
