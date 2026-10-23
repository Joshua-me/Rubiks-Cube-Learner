# Tutorial methods and algorithm provenance

Checked on 2026-10-22 against the selected creators' tutorial pages, chapter descriptions, and visible video instructions/notation. The app's sample states are generated locally; they are companion examples rather than copies of a creator's physical scramble. Setup playback reverses the demonstration from a solved practice baseline. Setup moves are labeled separately from the solving algorithm.

## 3x3 — CubeHead

[Selected tutorial](https://www.youtube.com/watch?v=PW2J8IblczM). Preserve the eight chapter starts: 0:53, 2:24, 4:49, 6:53, 7:06, 8:14, 9:37, 11:17.

| Stage | Method used in the app |
| --- | --- |
| White cross | First show the daisy around yellow. Think through the white edge moves; match each petal's side color, then send it Down with a half turn. No universal cross algorithm. |
| First layer | Righty `R U R' U'` and Lefty `L' U' L U`; position the corner over its matching slot first. |
| Middle layer | Move the edge one turn away, use Righty/Lefty, face the relevant side, and use the opposite trigger to restore the corner. |
| Last-layer inspection | Inspect edges and corners separately; no turn sequence. |
| Yellow cross | Line: `F (R U R' U') F'`. Back-left hook: `F (R U R' U') (R U R' U') F'`. |
| Yellow edge placement | Sune: `R U R' U R U2 R'`; match side edges and use the tutorial grip. |
| Yellow corner placement | Niklas: `R U' L' U R' U' L U`, with a correct corner at **front-left**. This differs in grip from J Perm's 2x2 placement sequence. |
| Final corner twists | Yellow Down; repeat Righty at bottom-front-right. Finish every four-turn trigger and use only D to advance between corners. |

The cross teaching group first shows the mental daisy, then a one-petal alignment example. Its U count is illustrative. The complete application rotates only U until a petal’s side sticker matches the front center, then F2; whole-cube y regrips bring other centers to the front. The engine verifies the match before every F2. There is no universal `L2 B2 R2 F2` cross algorithm.

The first-layer teaching group presents Righty and Lefty before its six application cases. Locally generated examples place white on Right/Left (one matching trigger), Up (three), or Front (regrip to the other side and use the opposite trigger once), with a separate front-right/front-left grip. Final y/y′ turns restore the example grip. These repetitions and regrips describe the prepared cases. Each full trigger preserves the white cross; recognition is checked against the actual sticker orientation.

The middle-layer notation is expanded into the named triggers and regrips:

- Right: `U (R U R' U') y (L' U' L U) y'`.
- Left: `U' (L' U' L U) y' (R U R' U') y`.

The final y/y' restores the app's original viewing orientation after the insertion. It is labeled as a regrip, not a new insertion algorithm. The complete first layer is verified to remain intact.

## 2x2 — J Perm

[Selected tutorial](https://www.youtube.com/watch?v=GANnG5a19kg), [creator's written reference](https://jperm.net/2x2).

Build the white layer with Righty `R U R' U'`. Place the upper corners with `U R U' L' U R' U' L`, using J Perm's front-right correct-corner grip. Finish by holding yellow Down, repeating Righty, and advancing between corners with D. The longer final-twist case is a composition of the taught trigger and Down adjustments.

## 4x4 — J Perm Yau

[Selected tutorial](https://www.youtube.com/watch?v=KWOZHbDdOeo), [creator's written reference](https://jperm.net/4x4).

Use white center, opposite center, three cross edges with white Left, remaining centers, edge pairing, then the 3x3 finish and parity. Center building and choosing pairing setups are intuitive; short bar/pair examples are locally prepared demonstrations, not universal algorithms.

- Front-right edge-flip helper: `R U R' F R' F' R`.
- OLL parity: `Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'`.
- PLL parity: `2R2 U2 2R2 Uw2 2R2 Uw2`.

`2R` is an inner-only slice; Rw moves two layers. Use the source's front/top parity location and allow x to rotate the whole cube.

## 5x5 — J Perm reduction

[Selected tutorial](https://www.youtube.com/watch?v=d1I-jJlVwB4), [creator's written reference](https://jperm.net/5x5).

Use first center, opposite center, four side centers with the finished centers Left/Right, edge groups, then the 3x3 finish. The difficult-center example links to 3:03; slice-flip-slice links to 5:35; final-edge parity links to 6:26.

- Edge-flip helper: `R U R' F R' F' R`.
- Last-edge parity: `Rw U2 x Rw U2 Rw U2 3Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'`.

Preserve the three-layer `3Rw'`. A reduced 5x5 does not use the 4x4 PLL-parity algorithm. Center-bar setup examples are illustrative, intuitive practice.

## Pyraminx — NOBLE CUBES and ParadoxCubing

[Selected four-minute tutorial](https://www.youtube.com/watch?v=pHBj8hixTfE), [selected EASY Beginner tutorial](https://www.youtube.com/watch?v=sCJcd6FKWAc).

Both references remain linked. Tips and center alignment precede base edges and last-layer work. The formula-bearing companion cases use ParadoxCubing's notation and preserve the completed base:

- Right edge helper: `R' L R L'`; left mirror: `L R' L' R`.
- Case 1 right, chapter 4:51: `R' L R L' U' L' U L`.
- Case 1 left, chapter 6:45: `L R' L' R U R U' R'`.

The video shows the two-flip and three-cycle continuations at 7:37 and 8:33 using the same Case 1 sequence from the required side. The app teaches the right/left sequences together and links the creator's recognition/grip explanation. Generic seven-move edge cycles were replaced with these on-screen eight-move sequences.

## Validation

`verify.js` checks exact source identities, chapter order, algorithm strings, prepared-case legality, solved replay, the fixed front-left Niklas corner, the protected first layer after middle insertions, and the preserved Pyraminx base. Browser checks verify setup/algorithm separation, actual piece-animation duration, pause/undo/cancellation, markers, and independent-to-guided case selection. Runtime remains offline; video links open externally only when chosen.
