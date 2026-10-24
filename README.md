# Twisty Lab

An offline puzzle solver and learning playground. Open `index.html` in a current browser; all runtime styles and solver code are embedded. No server or account is required.

The opening puzzle cards use the same 3D models as playback, with a slight rotation on hover or keyboard focus. Choose a puzzle and **Solve My Puzzle**, then paint every sticker using the labeled net. Keep the same orientation when following the computed moves. For Pyraminx, each face label lists its top, left, and right vertices. **Show All Faces** reveals the complete playback net. Pyraminx supports both white and red color schemes: use four colors, nine stickers each.

| Puzzle | What the calculator solves |
| --- | --- |
| 2x2 | Legal corner states, including odd permutations |
| 3x3 | Legal scanned states using a two-phase solver |
| Pyraminx | Legal scanned states, including independent tips |
| 4x4 | Legal scanned states, including centers, wing pairing, and OLL/PLL parity |
| 5x5 | Legal scanned states, including both center orbits and wing-to-middle-edge pairing |

Big-cube reduction uses pure three-piece cycles generated from small, embedded orbit tables. It handles fully scrambled states without external lookup files. These general solutions can contain hundreds of moves; they prioritize correctness over a short solution. The scanner checks piece identity, orientation, parity, and center-orbit counts as appropriate for each puzzle. Every solution is replayed internally before being displayed.

Guided Learning (Track A) and the Puzzle Coach button are temporarily hidden and will return in a future update after AI support is implemented. Independent Study (Track B) and verified solving remain available. The guided curriculum described below is retained for future use.

**Learn Techniques** offers CubeHead’s eight-stage 3x3 practice, J Perm’s 4x4 Yau and 5x5 reduction stages, two Pyraminx video references, and J Perm’s three-stage 2x2 practice. The White Cross stage starts with the **daisy**: four white petals around yellow, with a side note to solve it mentally without a fixed algorithm. Next, learn to align a single petal using as many U turns as needed, then F2. The full application demonstrates all four petals, checking the side sticker against its center before each F2; its sequence is an example, not a universal cross algorithm. Each stage opens with **Learn the moves**: explanations, a turn-by-turn breakdown, and animated algorithms. Related algorithms (such as Righty and Lefty) appear together in one teaching group before application cases. Teaching algorithms and application cases have separate lists. The white-corner stage then offers six separate examples: white faces right or left, white faces up over either slot, and white faces front over either slot. Each side guide gives Hold, Find, Position, and Use instructions. **Continue** then opens **Use the algorithm**, with recognition, setup, and application practice. Complete each demonstration to continue, or revisit algorithms and choose stages from the stage list. Final twisting teaches the reusable four-turn trigger before combining repetitions and Down turns. Each turn demonstration starts from an inverse-generated setup; inspection chapters show a prepared case. Completing a turn demonstration restores its solved baseline. These are prepared demonstrations, not automatic recognition of a physical puzzle. Independent Study uses cumulative display-only masks: pieces from earlier steps stay colored as new pieces are introduced, including when a later lesson changes grip. Play demonstration animates the current case in place; Pause stops autoplay, Replay restarts a completed sequence, and Next/Back still select cases. The daisy is labeled Mental step because it has no fixed algorithm. Masks follow the pieces through setup and playback. The starting position is an unsolved exercise; Preview completed target shows a separate solved reference without changing the exercise. The view faces the target layer, and each case includes a task and placement explanation. Track B opens with a brief explanation of matte charcoal masking for each selected puzzle. The Peek behind mask switch reveals all sticker colors without changing the exercise; switching it off restores the mask. Peeking pauses a running demonstration. About the mask reopens the explanation. The hidden Puzzle Coach implementation currently supplies local rule-based explanations.

The learning workspace centers a large, solid 3D model with one current-turn instruction. Drag the cube to inspect it while playback is paused. Play and Next Move restore the front-right teaching view before applying a turn, keeping U/F/R/L/D/B notation fixed to the puzzle. Rotation, Reset View, Next Lesson, and Previous Lesson are locked throughout animations and autoplay gaps. Pausing or completing playback restores their normal availability, including first/last lesson boundaries. Pausing unlocks the view after the current turn finishes; Reset View then restores the inspection camera without changing stickers. Detailed explanations, stage lists, and video references are expandable. NEXT applies one move, BACK undoes it, and Play/Pause stops at completion. The highlighted move stays synchronized with the animated turn. Non-mental lessons explain the grip and highlight a working piece and its destination. Watch setup slowly animates how a solved practice cube becomes that case; Play algorithm slowly then performs the tutorial moves. Slow (1.6-second turns), Very slow (2.8-second turns), and Normal are available. Long lesson sequences keep the current move visible and provide the full sequence in an expandable panel. See [tutorial provenance](TUTORIALS.md) for the creator algorithms and app-only regrips. Use lesson buttons to switch lessons and Restart Case to reset a demonstration. During 4x4/5x5 corrections, a parity banner directly beneath Your next step explains the cause and visual recognition. Autoplay pauses before each unreviewed correction; Continue parity algorithm or Play resumes it, and Next Move steps through it. Each correction is reviewed once per run; restarting the case/solution requests review again. 4x4 distinguishes OLL and PLL; 5x5 explains last-edge pairing parity, and internal wing-permutation adjustments are labeled separately. Reverse setup demonstrations and ordinary cases do not trigger a parity pause. Long solutions show the current phase, move progress, and a compact window of notation; expand Entire Solution to inspect all moves. Show Solved Result executes the remaining sequence instantly, preserving BACK history. Restart Playback restores your scan. Calculations run in a background worker and cancel when you leave the scanner or edit the scan.

## Camera scanning

In **Solve My Puzzle → Interactive Scanner**, choose **Start camera**, allow camera access, and show one complete face with visible seams. Match the selected face and the top/right orientation shown above the unmirrored preview. OpenCV detects the grid, straightens it, clusters each cell’s color samples, and maps the dominant clusters to the puzzle palette. A steady reading fills that face in the workspace automatically. Select the next face, position the puzzle, then choose **Scan selected face**. The scanner pauses between faces so it cannot fill multiple faces from the same view.

Square 2×2 through 5×5 grids and the nine triangular Pyraminx stickers are supported. Use even lighting and a nearly straight-on view; glare, hidden cells, indistinct seams, and ambiguous colors can prevent capture. Uncheck automatic filling to review a steady detection before choosing **Use detected face**. **Undo last capture** restores the previous face exactly. Manual painting remains available for corrections. All captures pass through the existing color-count and piece-legality checks before SOLVE unlocks.

The camera uses WebRTC `getUserMedia`; allow it on HTTPS or localhost when your browser restricts file access. Camera frames stay on the device. OpenCV.js 4.13.0 and its license are embedded in the HTML, with no CDN, upload, account, or signaling server. Processing runs in a worker; leaving the scanner, resetting, editing manually, or hiding the page stops camera tracks and pending processing. The bundled HTML is approximately 4.8 MB; OpenCV starts only when camera scanning is requested.

Run `npm run test:camera` for generated-camera tests using the real bundled OpenCV engine. They verify grid sizes, triangular cells, workspace writes, full-scan validation, capture undo, permission failures, stale requests, track cleanup, and offline/mobile behavior. Physical camera accuracy still depends on the device, puzzle colors, lighting, and orientation.

After changing `scripts/camera-vision-worker.js`, run `npm run build:camera`. To replace the library payload, supply the pinned official download to `node scripts/embed-opencv.cjs /path/to/opencv.js`; its SHA-256 must match the script. Preserve `vendor/OPENCV-LICENSE.txt` and the embedded license.

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
