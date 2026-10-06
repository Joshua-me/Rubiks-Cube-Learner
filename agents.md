# Twisty Lab — Project Instructions and Implementation Status

## Purpose

Maintain an offline puzzle solver and learning playground in a single runtime file, `index.html`. Support 3x3, Pyraminx, 4x4, and 5x5 with a white/slate interface, editable sticker nets, verified move playback, guided practice, and independent study masks. Development scripts and tests may live outside the HTML; running the app must not require a server, build, CDN, account, or network connection.

## Actual solver capabilities

| Puzzle | Implemented calculation | Limits |
| --- | --- | --- |
| 3x3 | Embedded cubejs 1.3.2 two-phase solver for legal scanned states | A valid solution, not a guarantee of the shortest solution or a beginner-method solution |
| Pyraminx | Tetrahedral move model, edge/center pattern tables, iterative deepening, independent tip correction | At most 11 body moves searched; tips corrected separately. Face orientation must match the labeled scanner |
| 4x4 | Reduced-cube solving, OLL/PLL parity correction, budgeted short corrections | General center building and wing pairing are not automated |
| 5x5 | Reduced-cube solving, supported inner-wing corrections with setup turns, budgeted short corrections | General center building and tredge pairing are not automated; the wing routine does not cover every unreduced state |

**Do not claim arbitrary 4x4/5x5 solving is complete.** An unsupported scan must show “Reduction required,” with no substituted lesson moves. The remaining feature is a general reduction engine or an appropriately licensed embedded solver; it must satisfy the offline/single-file constraint and receive end-to-end validation before being advertised.

The old “Godfather” arrays were fixed demonstrations, not solvers that calculated from a scan. They have been removed. The guided 3x3 curriculum still has eight stages; keep practice and calculation clearly distinct.

## State and face orientation

`AppState` is the single application state. It stores the selected puzzle, screen, training profile, facelet colors, move/case/lesson cursor, playback snapshots, completion/animation/calculation flags, timer, and view settings.

Cube facelets use **U, L, F, R, B, D** face order. Each face is a row-major square viewed directly from outside. Counts are 54 / 96 / 150. Solved defaults are white U, orange L, green F, red R, blue B, yellow D. Learning examples put white on D and yellow on U.

Pyraminx has 36 triangular facelets. Vertex labels are U (top), L (left), R (right), B (back). Each face shows its local **top / left / right vertex** labels:

- Base: L / B / R.
- Left: U / B / L.
- Right: U / R / B.
- Front: U / L / R.

The Pyraminx palette includes white and red as alternatives. A scan must contain exactly four colors with nine stickers each.

A triangular face has rows of 1, 3, and 5 cells, numbered row-major. Tips are 0/4/8, axial centers 2/5/7, and edge stickers 1/3/6. Body turns permute 12 stickers across three faces; tip-only turns permute three stickers. Both have order three. Infer the scanned face-color scheme from the axial centers.

## Engine requirements

- Generate cube sticker permutations from 3D position and outward normal. Use the same face geometry in the visual model. Do not restore hand-written strip cycles without independent model checks.
- Parse compact and spaced moves, apostrophes, half turns, wide turns (`Rw`, `3Rw`), and inner-only slices (`2R`). `2R2` means second layer from Right, half turn; `Rw2` means two layers together, half turn. Reject unsupported notation explicitly.
- Validate array length, allowed colors, and exact counts: 9/16/25 per cube color and 9 per Pyraminx color.
- On 3x3, reject duplicate/missing cubies, mirrored corners, corner-twist sums, edge-flip sums, duplicate centers, and permutation parity mismatch. Use ordered cubie conventions; a simple axis test for edge orientation rejects legal scrambles.
- On Pyraminx, validate reachable edge states and cyclic center/tip color order. Counts alone are insufficient.
- On big cubes, counts alone are a partial check. Validate a reduced 5x5 as a 3x3. Reduced 4x4 parity can be legal. Never describe count validity as proof of physical solvability.
- Calculate in an embedded Blob Worker. Keep the UI responsive; terminate pending work on navigation, scan edits, reset, or timeout. Ignore stale responses.
- Replay every returned solution internally using the actual puzzle model. Expose moves only if the final state is solved.
- Keep short big-cube search bounded in both depth and work. Exhausting this budget means unsupported by this calculator, not physically impossible.

## Playback and learning requirements

- The cursor denotes the next unapplied move. NEXT applies it once; completion disables further turns and stops autoplay.
- BACK restores an exact snapshot of colors, move cursor, case, lesson, and completion state. BACK at the start is harmless. Do not animate an undo as though it were the original forward turn.
- Prevent overlapping animations. Cancel delayed rendering when leaving the view or resetting a case.
- Keep lesson navigation separate from move playback. Changing cases/lessons stops autoplay and creates a fresh practice state/history.
- Prepare each guided example by reversing and inverting its algorithm from a solved baseline. Finishing the example must restore that baseline. Locally generated setups are demonstrations, not quoted tutorial cases or automatic recognition.
- Independent Study retains the selected puzzle and renders a prepared case with a relevant mask. Mask only the rendered copy; never overwrite actual sticker colors. Next/Back navigate study cases.
- Provide all-face net inspection as well as the 3D view. Scanner completion animation is a cue, not an instruction to mirror the net or guess a rotation.
- Keyboard shortcuts must ignore inputs, editable text, and focused buttons. Provide disabled controls, accessible sticker labels, live validation, focus indication, and reduced-motion CSS.
- The Puzzle Coach is a local rule-based helper, not an external AI service. Its text must match current solver limits and validation behavior.

## Implementation status

- [x] Single-file offline shell, embedded Tailwind styles, view routing, theme toggle.
- [x] Four puzzle cards, labeled dynamic scanner nets, painting, count validation, completion cue.
- [x] Physical cube facelet permutations and tetrahedral Pyraminx permutations.
- [x] 3x3/Pyraminx legality checks and full legal-state solving.
- [x] Background calculation, cancellation, and internal solution verification.
- [x] Reduced big-cube solving, 4x4 parity, supported 5x5 wing correction, bounded short search.
- [x] Move playback, exact undo, completion, autoplay, all-face inspection.
- [x] Eight-stage 3x3 practice and big-cube/Pyraminx case libraries.
- [x] Independent masks and prepared cases for all four puzzles.
- [x] Offline runtime regression checks and browser interaction checks.
- [ ] General unreduced 4x4/5x5 solving and complete big-cube legality checks.

## Files and validation

- `index.html`: shipped app, embedded CSS, licensed cubejs model/solver, and application engine.
- `verify.js`: dependency-free Node regression suite. Run `node verify.js` or `npm test`.
- `tests/browser.cjs`: Playwright checks including offline file loading, workers, scanning, playback/undo, cancellation, keyboard behavior, learning selection, and mobile layout. Run `npm run test:browser` after installing development dependencies and Chromium. On macOS the runner can use installed Chrome; `CHROME_PATH` overrides the executable.
- `scripts/build-styles.cjs`: regenerate embedded utility CSS after adding/changing classes. Run `npm run build:styles`. Custom CSS stays separate. The deployed HTML remains standalone.
- `README.md`: user instructions and supported solver scope; keep it in agreement with this file and the UI.

Before completing an engine change, run the Node checks and relevant browser checks. Test actual solved outcomes, random legal scrambles, impossible states, wide/inner turns, parity fixtures, completion/undo, and case resets. Inverse/four-turn invariants alone cannot prove a move model is correct.

Preserve cubejs's embedded MIT license and attribution. Do not replace vendored code casually. Do not deploy or change hosting solely because implementation work was requested.
