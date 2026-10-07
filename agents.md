# Twisty Lab — Project Instructions and Implementation Status

## Purpose

Maintain an offline puzzle solver and learning playground in a single runtime file, `index.html`. Support 2x2, 3x3, Pyraminx, 4x4, and 5x5 with a white/slate interface, editable sticker nets, verified move playback, guided practice, and independent study masks. Development scripts and tests may live outside the HTML; running the app must not require a server, build, CDN, account, or network connection.

## Actual solver capabilities

| Puzzle | Implemented calculation | Limits |
| --- | --- | --- |
| 2x2 | Complete corner-state solving using the shared outer-turn corner action and embedded solver | Verified solutions; shortest solutions are not guaranteed |
| 3x3 | Embedded cubejs 1.3.2 two-phase solver for legal scanned states | A valid solution, not a guarantee of the shortest solution or a beginner-method solution |
| Pyraminx | Tetrahedral move model, edge/center pattern tables, iterative deepening, independent tip correction | At most 11 body moves searched; tips corrected separately. Face orientation must match the labeled scanner |
| 4x4 | Full wing pairing and center solving with pure three-piece cycles, followed by 3x3 solving and OLL/PLL parity as needed | General reduction favors correctness over move count; solutions can contain hundreds of moves |
| 5x5 | Full wing-to-midge pairing, both center orbits, and reduced 3x3 solving | General reduction favors correctness over move count; solutions can contain hundreds of moves |

Every legal scan is supported by the calculation engine. Never substitute lesson moves for a solution. Require full piece legality and replay the complete result before displaying it. The small direct-correction search is only an optimization; exceeding its depth must fall through to the general reduction engine.

The old “Godfather” arrays were fixed demonstrations, not solvers that calculated from a scan. They have been removed. The guided 3x3 curriculum still has eight stages; keep practice and calculation clearly distinct.

## State and face orientation

`AppState` is the single application state. It stores the selected puzzle, screen, training profile, facelet colors, move/case/lesson cursor, playback snapshots, completion/animation/calculation flags, timer, and view settings.

Cube facelets use **U, L, F, R, B, D** face order. Each face is a row-major square viewed directly from outside. Counts are 24 / 54 / 96 / 150 for 2x2 / 3x3 / 4x4 / 5x5. Solved defaults are white U, orange L, green F, red R, blue B, yellow D. Learning examples put white on D and yellow on U.

Pyraminx has 36 triangular facelets. Vertex labels are U (top), L (left), R (right), B (back). Each face shows its local **top / left / right vertex** labels:

- Base: L / B / R.
- Left: U / B / L.
- Right: U / R / B.
- Front: U / L / R.

The Pyraminx palette includes white and red as alternatives. A scan must contain exactly four colors with nine stickers each.

A triangular face has rows of 1, 3, and 5 cells, numbered row-major. Tips are 0/4/8, axial centers 2/5/7, and edge stickers 1/3/6. Body turns permute 12 stickers across three faces; tip-only turns permute three stickers. Both have order three. Infer the scanned face-color scheme from the axial centers.

## Engine requirements

- Generate cube sticker permutations from 3D position and outward normal. Use the same face geometry in the visual model. Do not restore hand-written strip cycles without independent model checks.
- Parse compact and spaced moves, apostrophes, half turns, wide turns (`Rw`, `3Rw`), and inner-only slices (`2R`). `2R2` means second layer from Right, half turn; `Rw2` means two layers together, half turn. Support whole-cube rotations `x`, `y`, and `z`, including primes and half turns, for the video parity algorithms. Reject unsupported notation explicitly.
- Validate array length, allowed colors, and exact counts: 4/9/16/25 per cube color and 9 per Pyraminx color.
- On 2x2, check the eight corners, cyclic color order, distinct identities, and total twist. Odd corner permutations are legal. For calculation, embed the corner state in a legal 3x3 search state with edge parity matched to its corners; replay the resulting outer moves on the actual 24-sticker 2x2.
- On 3x3, reject duplicate/missing cubies, mirrored corners, corner-twist sums, edge-flip sums, duplicate centers, and permutation parity mismatch. Use ordered cubie conventions; a simple axis test for edge orientation rejects legal scrambles.
- On Pyraminx, validate reachable edge states and cyclic center/tip color order. Counts alone are insufficient.
- On big cubes, validate corner identity/chirality/twist, all 24 oriented wings, and each 24-center orbit's four stickers per color. On 5x5, validate the fixed-center/corner/middle-edge core as a 3x3. Reduced 4x4 parity is legal; do not reject it as a 3x3 parity mismatch. Infer the 4x4 color frame from corner adjacency and chirality; use fixed centers on 5x5.
- Calculate in an embedded Blob Worker. Keep the UI responsive; terminate pending work on navigation, scan edits, reset, or timeout. Ignore stale responses.
- Replay every returned solution internally using the actual puzzle model. Expose moves only if the final state is solved.
- General reduction uses the wing commutator `2R U 2R' D 2R U' 2R' D'`, diagonal-center commutator `2R U' 2L' U 2R' U' 2L U`, and 5x5 axial-center commutator `3R U' 2L' U 3R' U' 2L U`. Verify each base cycle moves only its three target pieces.
- Generate conjugated cycles by breadth-first search over projected outer/inner moves. Each 24-piece orbit must cover all **4,048 directed three-cycles** before being used. Cache these small tables; no large external lookup files are needed.
- Correct odd wing parity with an inner turn before pairing. On 5x5, pair wings with their actual middle edges, not with an assumed solved edge arrangement. Center labels of the same color are interchangeable; choose an even assignment and sort it with pure cycles.
- Keep the depth-two direct-correction search bounded. If it finds nothing, use complete reduction; never treat that search limit as an unsupported scan.

## Playback and learning requirements

- The cursor denotes the next unapplied move. NEXT applies it once; completion disables further turns and stops autoplay.
- BACK restores an exact snapshot of colors, move cursor, case, lesson, and completion state. BACK at the start is harmless. Do not animate an undo as though it were the original forward turn.
- Prevent overlapping animations. Cancel delayed rendering when leaving the view or resetting a case.
- For long calculated solutions, display a window of up to 21 moves, phase ranges, total progress, and a collapsible complete algorithm. Show Solved Result applies every remaining move while retaining exact undo snapshots. Restart Playback restores the original scan. Never silently replace the input state with a solved template.
- Keep lesson navigation separate from move playback. Changing cases/lessons stops autoplay and creates a fresh practice state/history.
- Prepare each guided turn example by reversing and inverting its algorithm from a solved baseline. Inspection-only steps may supply an explicit legal `setupMoves` array. Honor lesson grip: white Down normally, white Left for Yau cross/remaining centers, yellow Down for final corner twists. Finishing the example must restore that baseline. Locally generated setups are demonstrations, not quoted tutorial cases or automatic recognition.
- Independent Study retains the selected puzzle and renders a prepared case with a relevant mask. Mask only the rendered copy; never overwrite actual sticker colors. Next/Back navigate study cases.
- Provide all-face net inspection as well as the 3D view. Scanner completion animation is a cue, not an instruction to mirror the net or guess a rotation.
- Keyboard shortcuts must ignore inputs, editable text, and focused buttons. Provide disabled controls, accessible sticker labels, live validation, focus indication, and reduced-motion CSS.
- The Puzzle Coach is a local rule-based helper, not an external AI service. Its text must match current solver limits and validation behavior.

## Tutorial sources

Guided lessons and links use the requested videos:

- 3x3: [CubeHead 2026 beginner tutorial](https://www.youtube.com/watch?v=PW2J8IblczM), with the eight verified chapter starts: 0:53, 2:24, 4:49, 6:53, 7:06, 8:14, 9:37, 11:17. Preserve that order, including the inspection chapter and final corner twists.
- 4x4: [J Perm full Yau tutorial](https://www.youtube.com/watch?v=KWOZHbDdOeo). Use six stages: first center, opposite center, partial cross, other centers, edge pairing, 3x3/parity. The guided OLL and PLL examples use the published video algorithms, including `x`.
- 5x5: [J Perm beginner reduction tutorial](https://www.youtube.com/watch?v=d1I-jJlVwB4). Use five stages: first center, opposite center, side centers, edge groups, 3x3 finish. Link the confirmed 3:03 center example, 5:35 slice-flip-slice, and 6:26 parity example. Preserve `3Rw'` and `x` in the parity practice.
- Pyraminx: [NOBLE CUBES four-minute tutorial](https://www.youtube.com/watch?v=pHBj8hixTfE) and [ParadoxCubing EASY Beginner tutorial](https://www.youtube.com/watch?v=sCJcd6FKWAc). Both appear in the learning hub and source panels; use ParadoxCubing's verified 0:13, 1:20, and 4:51 chapter links for companion stages.
- 2x2: [J Perm beginner tutorial](https://www.youtube.com/watch?v=GANnG5a19kg), with layer building, corner placement, and final twisting.

Keep one source object per video and resolve lesson references by key. These are locally prepared companion drills. Calculation mode computes and verifies a state-dependent solution using the numerical engines documented above; guided mode teaches the tutorial stages. Videos open on YouTube when chosen; the app and practice cases remain offline. Do not embed remote players, thumbnails, or other runtime dependencies without a requested change to that requirement.

## Implementation status

- [x] Single-file offline shell, embedded Tailwind styles, view routing, theme toggle.
- [x] Five puzzle cards, labeled dynamic scanner nets, painting, count validation, completion cue.
- [x] Physical cube facelet permutations and tetrahedral Pyraminx permutations.
- [x] 2x2/3x3/Pyraminx legality checks and full legal-state solving.
- [x] Background calculation, cancellation, and internal solution verification.
- [x] General big-cube reduction, complete oriented-wing/center-orbit validation, 4x4 parity, bounded direct-correction optimization.
- [x] Move playback, exact undo, completion, autoplay, all-face inspection.
- [x] Eight-stage 3x3 practice and big-cube/Pyraminx case libraries.
- [x] Independent masks and prepared cases for all five puzzles.
- [x] Offline runtime regression checks and browser interaction checks.
- [x] General unreduced 4x4/5x5 solving and full visible-piece legality checks.
- [x] Phase progress, compact move display, instant final-state inspection, and scan restart for long solutions.

## Files and validation

- `index.html`: shipped app, embedded CSS, licensed cubejs model/solver, and application engine.
- `verify.js`: dependency-free Node regression suite. Run `node verify.js` or `npm test`. It checks 40 long 2x2 scrambles, legal odd corner permutations, tutorial source/chapter identities, rotations, and all 20,240 conjugated three-cycles across the five 24-piece orbits, 80 long mixed-layer big-cube scrambles, alternate color schemes, impossible states, and complete solved outcomes.
- `tests/browser.cjs`: Playwright checks including offline file loading, workers, scanning, playback/undo, cancellation, keyboard behavior, learning selection, full unreduced 4x4/5x5 worker solves, long-plan completion/restart/undo, and mobile layout. Run `npm run test:browser` after installing development dependencies and Chromium. On macOS the runner can use installed Chrome; `CHROME_PATH` overrides the executable.
- `scripts/build-styles.cjs`: regenerate embedded utility CSS after adding/changing classes. Run `npm run build:styles`. Custom CSS stays separate. The deployed HTML remains standalone.
- `README.md`: user instructions and supported solver scope; keep it in agreement with this file and the UI.

Before completing an engine change, run the Node checks and relevant browser checks. Test actual solved outcomes, random legal scrambles, impossible states, wide/inner turns, parity fixtures, completion/undo, and case resets. Inverse/four-turn invariants alone cannot prove a move model is correct.

Preserve cubejs's embedded MIT license and attribution. Do not replace vendored code casually. Do not deploy or change hosting solely because implementation work was requested.
