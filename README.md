# Twisty Lab

An offline puzzle solver and learning playground. Open `index.html` in a current browser; all runtime styles and solver code are embedded. No server or account is required.

The app follows three steps: **Choose & Configure Puzzle**, **Scan & Input State**, then **Interactive Solve/Study**. The progress sidebar enables the final step only after configuration and input validation. Solve mode uses your scanned or painted stickers; study mode first shows a checked practice state for review. Editing a scan locks the final step again until the state is valid.

The workspace has two panels: the left sandbox holds the large 3D model, masking guidance, current-turn instruction and **Back / Pause / Play / Next Move** controls. The right instruction stack holds large algorithm notation, a tutorial video slot and a persistent local helper conversation. Desktop instructions scroll within their panel while the helper stays readable. On mobile, the compact sandbox stays above the scrolling instructions. The face compass follows the inspection camera: U is Top, F is Front, and dashed axes point away from you. Playback locks the camera to the teaching grip. **⚙ Tools** at the canvas’s upper right contains speed, mask controls, all-face inspection and reset. **Lesson details & cases** contains longer explanations, case navigation and complete calculated solutions.

The opening puzzle cards use the same 3D models as playback, with a slight rotation on hover or keyboard focus. Choose a puzzle and **Solve My Puzzle**, then paint every sticker using the labeled unfolded cross map. The selected color stays on your brush, and each click or Enter/Space advances focus to the next empty square. Arrow keys move through the cross without painting. Use Larger stickers for touch entry on small screens; Fit map restores the complete overview. Keep the same orientation when following the computed moves. For Pyraminx, each face label lists its top, left, and right vertices. **Show All Faces** reveals the complete playback net. Pyraminx supports both white and red color schemes: use four colors, nine stickers each.

| Puzzle | What the calculator solves |
| --- | --- |
| 2x2 | Legal corner states, including odd permutations |
| 3x3 | Legal scanned states using a two-phase solver |
| Pyraminx | Legal scanned states, including independent tips |
| 4x4 | Legal scanned states, including centers, wing pairing, and OLL/PLL parity |
| 5x5 | Legal scanned states, including both center orbits and wing-to-middle-edge pairing |

Big-cube reduction uses pure three-piece cycles generated from small, embedded orbit tables. It handles fully scrambled states without external lookup files. These general solutions can contain hundreds of moves; they prioritize correctness over a short solution. The scanner checks piece identity, orientation, parity, and center-orbit counts as appropriate for each puzzle. Every solution is replayed internally before being displayed.

Guided Learning (Track A) and the floating Puzzle Coach button remain hidden for future updates. The workspace now exposes the existing rule-based Twisty Lab helper inline; it is not an AI service. Independent Study (Track B) and verified solving remain available. The guided curriculum described below is retained for future use.

**Learn Techniques** offers CubeHead’s eight-stage 3x3 practice, J Perm’s 4x4 Yau and 5x5 reduction stages, two Pyraminx video references, and J Perm’s three-stage 2x2 practice. The White Cross stage starts with the **daisy**: four white petals around yellow, with a side note to solve it mentally without a fixed algorithm. Next, learn to align a single petal using as many U turns as needed, then F2. The full application demonstrates all four petals, checking the side sticker against its center before each F2; its sequence is an example, not a universal cross algorithm. Each stage opens with **Learn the moves**: explanations, a turn-by-turn breakdown, and animated algorithms. Related algorithms (such as Righty and Lefty) appear together in one teaching group before application cases. Teaching algorithms and application cases have separate lists. The white-corner stage then offers six separate examples: white faces right or left, white faces up over either slot, and white faces front over either slot. Each side guide gives Hold, Find, Position, and Use instructions. **Continue** then opens **Use the algorithm**, with recognition, setup, and application practice. Complete each demonstration to continue, or revisit algorithms and choose stages from the stage list. Final twisting teaches the reusable four-turn trigger before combining repetitions and Down turns. Each turn demonstration starts from an inverse-generated setup; inspection chapters show a prepared case. Completing a turn demonstration restores its solved baseline. These are prepared demonstrations, not automatic recognition of a physical puzzle. The 3×3 Independent Study sequence includes all eight CubeHead stages and all 16 application cases, including six white-corner cases and both middle-layer inserts. Stage/case progress and the collapsible All solve stages list make the full sequence available without opening Guided Learning. Independent Study uses cumulative display-only masks: pieces from earlier steps stay colored as new pieces are introduced, including when a later lesson changes grip. Play demonstration animates the current case in place; Pause stops autoplay, Replay restarts a completed sequence, and the primary Next Move/Back controls apply or undo a turn. After a case finishes, Next step prepares the following case. Previous case/Next case in Advanced Tools select cases directly. The daisy is labeled Mental step because it has no fixed algorithm. Masks follow the pieces through setup and playback. The starting position is an unsolved exercise; Preview completed target shows a separate solved reference without changing the exercise. The view faces the target layer, and each case includes a task and placement explanation. Entering Independent Study or changing solve stages opens a brief explanation with a three-second masking illustration. The phase label under Your next step identifies the current curriculum stage. Open Tools ⚙ above the cube and hold Peek behind mask (mouse, touch, Space or Enter) to fade the charcoal layer to 20%; release to restore it without changing moves or stickers. About the mask in Tools ⚙ reopens the explanation. The Peek behind mask switch reveals all sticker colors without changing the exercise; switching it off restores the mask. Changing the persistent switch pauses a running demonstration; holding the workspace Peek button leaves playback running. Both the hold-to-peek button and persistent mask switch live in Tools ⚙. Closing Tools restores any transient peek. The inline Twisty Lab helper supplies local rule-based explanations and retains the conversation while lessons change.

The learning sandbox centers a large, solid 3D model with one current-turn instruction. Drag the cube to inspect it while playback is paused. Play and Next Move restore the front-right teaching view before applying a turn, keeping U/F/R/L/D/B notation fixed to the puzzle. Rotation, Reset View, Next Lesson, and Previous Lesson are locked throughout animations and autoplay gaps. Pausing or completing playback restores their normal availability, including first/last lesson boundaries. Pausing unlocks the view after the current turn finishes; Reset View then restores the inspection camera without changing stickers. Detailed explanations, stage lists, and video references are expandable. NEXT applies one move, BACK undoes it, and Play/Pause stops at completion. The highlighted move stays synchronized with the animated turn. Non-mental lessons explain the grip and highlight a working piece and its destination. Watch setup slowly animates how a solved practice cube becomes that case; Play algorithm slowly then performs the tutorial moves. Slow (1.6-second turns), Very slow (2.8-second turns), and Normal are available. Long lesson sequences keep the current move visible and provide the full sequence in an expandable panel. See [tutorial provenance](TUTORIALS.md) for the creator algorithms and app-only regrips. Use lesson buttons to switch lessons and Restart Case to reset a demonstration. During 4x4/5x5 corrections, a parity banner directly beneath Your next step explains the cause and visual recognition. Autoplay pauses before each unreviewed correction; Continue parity algorithm or Play resumes it, and Next Move steps through it. Each correction is reviewed once per run; restarting the case/solution requests review again. 4x4 distinguishes OLL and PLL; 5x5 explains last-edge pairing parity, and internal wing-permutation adjustments are labeled separately. Reverse setup demonstrations and ordinary cases do not trigger a parity pause. Long solutions show the current phase, move progress, and a compact window of notation; expand Entire Solution to inspect all moves. Show Solved Result executes the remaining sequence instantly, preserving BACK history. Restart Playback restores your scan. Calculations run in a background worker and cancel when you leave the scanner or edit the scan.

## Scanner feedback

The input map has an adjacent live 3D preview driven by the same sticker indices. Front/Top and Back/Bottom inspection buttons change only the preview angle. Painting, camera captures, undo, reset and solved examples update both views; neither view substitutes a solved template.

The scanner shows Top (U), Left (L), Front (F), Right (R), Back (B), and Bottom (D) in one flat cross. The sticky palette shows the active brush and per-color counts. **Validate scan** marks impossible combinations in both the map and preview with solid red borders and pulses them briefly. Specific messages explain repeated-color pieces, duplicate identities, opposite-color pairs, mirrored corners, fixed centers, and center-orbit mistakes. **Locate stickers** focuses the relevant entry without painting it. Correcting the input refreshes the feedback and unlocks the final wizard step only when full legality passes.

Dashed red borders identify review groups for count or global orientation/parity failures. Some entries in these groups may already be correct; the app does not pretend it can identify a unique bad sticker from a global constraint. Reduced motion keeps static error borders. Pyraminx retains its labeled triangular map and adds error badges.

## Camera scanning

In **Solve My Puzzle → Interactive Scanner**, expand **Use a camera instead (optional)**, choose **Start camera**, allow camera access, and show one complete face with visible seams. Match the selected face and the top/right orientation shown above the unmirrored preview. OpenCV detects the grid, straightens it, clusters each cell’s color samples, and maps the dominant clusters to the puzzle palette. A steady reading fills that face in the workspace automatically. Select the next face, position the puzzle, then choose **Scan selected face**. The scanner pauses between faces so it cannot fill multiple faces from the same view.

Square 2×2 through 5×5 grids and the nine triangular Pyraminx stickers are supported. Use even lighting and a nearly straight-on view; glare, hidden cells, indistinct seams, and ambiguous colors can prevent capture. Uncheck automatic filling to review a steady detection before choosing **Use detected face**. **Undo last capture** restores the previous face exactly. Manual painting remains available for corrections. All captures pass through the existing color-count and piece-legality checks before SOLVE unlocks.

The camera uses WebRTC `getUserMedia`; allow it on HTTPS or localhost when your browser restricts file access. Camera frames stay on the device. OpenCV.js 4.13.0 and its license are embedded in the HTML, with no CDN, upload, account, or signaling server. Processing runs in a worker; leaving the scanner, resetting, editing manually, hiding the page, or closing the camera panel stops camera tracks and pending processing. The bundled HTML is approximately 4.8 MB; OpenCV starts only when camera scanning is requested.

Run `npm run test:camera` for generated-camera tests using the real bundled OpenCV engine. They verify grid sizes, triangular cells, workspace writes, full-scan validation, capture undo, permission failures, stale requests, track cleanup, and offline/mobile behavior. Physical camera accuracy still depends on the device, puzzle colors, lighting, and orientation.

After changing `scripts/camera-vision-worker.js`, run `npm run build:camera`. To replace the library payload, supply the pinned official download to `node scripts/embed-opencv.cjs /path/to/opencv.js`; its SHA-256 must match the script. Preserve `vendor/OPENCV-LICENSE.txt` and the embedded license.

## Learning videos

- [CubeHead — 3x3 beginner tutorial (2026 title)](https://www.youtube.com/watch?v=PW2J8IblczM)
- [J Perm — full 4x4 Yau tutorial](https://www.youtube.com/watch?v=KWOZHbDdOeo)
- [J Perm — 5x5 beginner reduction tutorial](https://www.youtube.com/watch?v=d1I-jJlVwB4)
- [NOBLE CUBES — four-minute Pyraminx tutorial](https://www.youtube.com/watch?v=pHBj8hixTfE)
- [ParadoxCubing — EASY Beginner Pyraminx tutorial](https://www.youtube.com/watch?v=sCJcd6FKWAc)
- [J Perm — 2x2 beginner tutorial](https://www.youtube.com/watch?v=GANnG5a19kg)

The learning screens link these videos and confirmed chapters. Companion examples are prepared for the app, and calculation mode uses the verified solving engines. The workspace video slot loads a YouTube privacy-enhanced iframe only after you choose Load video from YouTube; no player or thumbnail is fetched beforehand. A lesson change updates its chapter, ordinary turns keep the loaded player, and leaving playback removes it. Source links remain available. Videos need a connection; scanning, solving and practice remain offline.

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

Run `npm run test:focus` for five-puzzle map/preview synchronization, independent Back/Bottom orientation fixtures, shared diagnostic indices, console layout stability, persistent helper context, gear masking, explicit video loading/cleanup and mobile/dark behavior. Its video test intercepts the requested player with a local fixture.

For a quick check after layout or routing edits, run `npm run test:smoke`. This uses Node’s test runner and offline Playwright to check all five input matrices, sticky brush selection, invalidated validation gates, display-only 3D/net/mask tools, move undo and case progression, and navigation during animation/autoplay. It does not initialize camera scanning or generate solver tables. Each test starts in a fresh browser context and checks for browser exceptions and remote requests.

The state boundaries under test are `AppState.colorDataMap` (saved input for each puzzle), `selectedPaintBrush` (sticky palette selection), `wizard.validatedInput` (validation for the current puzzle/mode/colors), and `playbackState` plus its cursor/history (a separate practice workspace). Routing may rebuild controls and stop transient work, but must retain entered colors. Starting a new practice case intentionally resets move history. Input retention here is within the open page; scans are not persisted across reloads.

On macOS, browser checks can use installed Google Chrome. Set `CHROME_PATH` to use a specific Chrome/Chromium executable. The test runner writes a mobile screenshot to the temporary directory; `SCREENSHOT_PATH` overrides it.

The checks cover 40 long 2x2 scrambles and legal odd corner permutations, named tutorial/chapter links, whole-cube rotations, standard cube-model agreement, random legal scrambles, impossible states, actual solved outcomes, tetrahedral turns, wide/inner layers, parity, all 20,240 directed three-cycles, 80 long mixed-layer 4x4/5x5 scrambles, alternate color schemes, lessons, masks, exact undo/restart, offline workers, cancellation, and browser controls.

The embedded [cubejs 1.3.2](https://github.com/ldez/cubejs) model and two-phase solver are MIT licensed by Petri Lehtinen and Ludovic Fernandez; their full license is preserved in `index.html`. Tailwind CSS 4.3.0 is compiled into the HTML. Development tooling is not needed to run the app.
