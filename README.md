# Rubiks-Cube-Learner

Twisty Lab is a static, single-page twisty-puzzle learning playground. The app lives in `index.html` and supports:

- 3x3, 4x4, 5x5, and Pyraminx scanner layouts
- strict sticker color-count validation
- animated move playback for beginner/reduction methods
- guided hints and 3x3 Independent Study masking
- a local keyword-based coach panel

Open `index.html` in a browser to run the app.

## Verify

Run the local verifier before deploying:

```sh
node verify.js
```

The verifier compiles the inline app script, checks scanner validators, confirms move inverse/rotation invariants, checks algorithm parsing, and ensures Independent Study builds its own study plan.
