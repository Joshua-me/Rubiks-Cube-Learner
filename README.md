# Rubiks-Cube-Learner

Twisty Lab is a static, single-page twisty-puzzle learning playground. The app lives in `index.html` and supports:

- 3x3, 4x4, 5x5, and Pyraminx scanner layouts
- strict sticker color-count validation
- calculation-only Solve My Puzzle playback with bounded exact search
- guided source-backed case libraries for beginner/reduction methods
- 3x3 Independent Study masking

Open `index.html` in a browser to run the app.

## Verify

Run the local verifier before deploying:

```sh
node verify.js
```

The verifier compiles the inline app script, checks scanner validators, confirms move inverse/rotation invariants, checks algorithm parsing, and ensures Guided Practice, Independent Study, and calculation-only solve plans build correctly.
