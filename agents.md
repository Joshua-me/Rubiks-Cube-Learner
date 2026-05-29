# Agent Execution Plan: Advanced Neo-Minimalist Puzzle Platform

## 🎯 Project Vision
A premium, self-contained single-file (`index.html`) interactive playground enabling users to dynamically configure physical state inputs across 4 classic twisty puzzles (3x3, Pyraminx, 4x4, 5x5). It delivers an animated playback solution engine via the "Godfather Method", and provides guided/isolated learning frameworks featuring smart structural masking overlays.

---

## 🛠️ System State Configuration Model
```javascript
const ApplicationState = {
  activeScreen: 'dashboard',      // dashboard, mode-select, input-scanner, playback-engine, learning-hub
  puzzleType: '3x3',              // 3x3, pyraminx, 4x4, 5x5
  trainingProfile: null,          // guided, independent
  activeStepIndex: 0,             // Tracking sequence numbers inside execution arrays
  activeMoveIndex: 0,             // Index tracking single character notation moves inside an active algorithm string
  selectedPaintBrush: '#ffffff', // Active color hex value selected in input scanner
  
  // Normalized facelet maps storing color hex strings
  colorDataMap: {
    '3x3': Array(54).fill('#e2e8f0'),      // Slate layout default fills
    '4x4': Array(96).fill('#e2e8f0'),      
    '5x5': Array(150).fill('#e2e8f0'),     
    'pyraminx': Array(36).fill('#e2e8f0')  
  }
};
```

---

## 🚀 Granular Development Roadmap

### Phase 1: Core Shell Framework & Neo-Minimalist Styles
- [ ] Initialize single-page view router using state-reactive class switching (`.hidden { display: none !important; }`).
- [ ] Setup full Tailwind CSS layout templates utilizing clean white/slate tones (`bg-slate-50`, `text-slate-900`, fine border rings).
- [ ] Implement scalable SVG/Canvas static components modeling distinct wireframe isometric silhouettes for the 4 target puzzles.

### Phase 2: Exploded Matrix Input Scanner & Orientation Sequencer
- [ ] Code dynamic UI generator creating layout grids matching selected dimensional counts (3x3 up to 5x5 grid fields).
- [ ] Write click-to-paint state listener tracking index overrides from the active color palette.
- [ ] Construct the Face Flip Animation: Use standard CSS 3D transform keyframes (`transform: rotateY(180deg) scale(0.98)`) applied directly to the scanner container to signal safe physical rotations to the end-user.
- [ ] Build strict global validation metrics checking exact structural element limits via `PuzzleValidators`.

### Phase 3: The Godfather Method Playback Core
- [ ] Build a robust parsing engine that accepts algorithm notation blocks and breaks them down into individual steps.
- [ ] Implement UI step panel tracking: Top half displays active puzzle visual states, bottom half highlights current instruction blocks.
- [ ] Code player mechanics loops: Bind `Back`, `Play/Pause Timer Interval`, and `Next` handlers directly to active state indices.

### Phase 4: Educational Modules & Visual Masking Engine
- [ ] **Guided Track:** Link the live solver views to a dynamic string lookup table to output contextual, user-friendly tips alongside standard formulas.
- [ ] **Independent Track:** Program an isolated rendering override mask. If a case is flagged as an independent case, iterate through facelet arrays and explicitly swap non-essential indices out for a flat `#1e1e24` matte black layer before paint execution.
- [ ] Ensure all mock algorithm sequences perfectly parse and execute standard layout moves.

### Phase 5: Hardcoded Algorithmic Arrays & Parity Maps
- [ ] Implement complete `PuzzleValidators` functions mapping exact 9, 16, 25 sticker color boundaries.
- [ ] Embed full 8-stage step definitions for `Godfather3x3Solver` notation strings.
- [ ] Inject raw 4x4/5x5 WCA multi-slice parity logic (`Rw2`, `Uw2`, etc.) directly into global execution modules.
- [ ] Construct the masking overlay algorithm matching the target index array patterns inside `IndependentLearningLibrary`.

---

## ⚠️ High-Risk Conditions & Automated Safety Shields
1. **Impossible Input Permutations:** Users may paint combinations that are mathematically impossible to solve. 
   * *Shield:* The input scanner engine features a strict count validator. If the color counts do not line up exactly with a standard configuration, the "SOLVE" button remains locked and an explicit error toast provides debugging tips.
2. **Buffer/Token Overflow:** Massive algorithm tables can cause single files to look messy.
   * *Shield:* Keep string variables highly structured using compact array lookups, ensuring clean code readability inside the unified script.
