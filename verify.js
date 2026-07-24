const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>\n([\s\S]*)\n  <\/script>/);

if (!match) {
  throw new Error('Could not find the inline application script in index.html.');
}

const script = match[1].replace(/\n\s*renderPuzzleCards\(\);\n\s*wireEvents\(\);\s*$/, '');
const api = new Function(`${script}
return {
  AppState,
  COLORS,
  PUZZLES,
  PuzzleValidators,
  applyCubeMove,
  applyPyraminxMove,
  areInverseMoves,
  createBlankState,
  createSolvedState,
  buildCalculatedSolvePlan,
  parseAlgorithmMoves,
  prepareAlgorithm
};`)();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function inverse(move) {
  if (move.includes('2')) return move;
  return move.includes("'") ? move.replace("'", '') : `${move}'`;
}

for (const type of Object.keys(api.PUZZLES)) {
  assert(api.PuzzleValidators[type](api.createSolvedState(type)), `${type} solved state should validate`);
  assert(!api.PuzzleValidators[type](api.createBlankState(type)), `${type} blank state should not validate`);
}

assert(!api.PuzzleValidators['3x3'](api.createSolvedState('3x3').concat('#ffffff')), 'Extra scanner entries should not validate');
assert(!api.areInverseMoves('R', "Rw'"), 'Outer and wide turns must not be treated as the same move family');
assert(api.areInverseMoves('Rw2', 'Rw2'), 'Double wide turns should be self-inverse');

const parsed = api.parseAlgorithmMoves("RUR'U' Rw2,Uw'").join(' ');
assert(parsed === "R U R' U' Rw2 Uw'", `Parser mismatch: ${parsed}`);

for (const size of [3, 4, 5]) {
  const length = 6 * size * size;
  const moves = ['U', 'R', 'F', 'D', 'L', 'B'];
  if (size > 3) moves.push('Rw', 'Lw', 'Uw');

  for (const move of moves) {
    const start = Array.from({ length }, (_, index) => String(index));

    api.AppState.playbackState = start.slice();
    api.applyCubeMove(move, size);
    api.applyCubeMove(inverse(move), size);
    assert(api.AppState.playbackState.join('|') === start.join('|'), `${size} ${move}+inverse failed`);

    api.AppState.playbackState = start.slice();
    for (let turn = 0; turn < 4; turn++) api.applyCubeMove(move, size);
    assert(api.AppState.playbackState.join('|') === start.join('|'), `${size} ${move} x4 failed`);
  }
}

for (const move of ['U', 'R', 'L', 'B', 'u', 'l', 'r', 'b']) {
  const start = Array.from({ length: 36 }, (_, index) => String(index));
  api.AppState.playbackState = start.slice();
  api.applyPyraminxMove(move);
  api.applyPyraminxMove(inverse(move));
  assert(api.AppState.playbackState.join('|') === start.join('|'), `Pyraminx ${move}+inverse failed`);
}

api.AppState.trainingProfile = 'independent';
api.AppState.puzzleType = '3x3';
api.AppState.playbackState = api.createSolvedState('3x3');
const independentPlan = api.prepareAlgorithm('independent');
assert(independentPlan.length === 4, 'Independent Study should expose all four study cases');
assert(/^Independent Study/.test(independentPlan[0].stepName), 'Independent Study should use its own plan');

for (const type of Object.keys(api.PUZZLES)) {
  api.AppState.trainingProfile = 'guided';
  api.AppState.puzzleType = type;
  api.AppState.playbackState = api.createSolvedState(type);
  const guidedPlan = api.prepareAlgorithm('guided');
  assert(guidedPlan.length > 0, `${type} guided plan should exist`);
  assert(guidedPlan.every(step => step.source && step.cases && step.cases.length), `${type} guided steps should expose source-backed cases`);

  const calculatedPlan = api.buildCalculatedSolvePlan(type, api.createSolvedState(type));
  assert(calculatedPlan.length === 1, `${type} calculated solve should produce a plan`);
  assert(calculatedPlan[0].calculationOnly, `${type} solve plan should be calculation-only`);
  assert(/Already Solved/.test(calculatedPlan[0].stepName), `${type} solved scan should be detected`);
}

console.log('verify: ok');
