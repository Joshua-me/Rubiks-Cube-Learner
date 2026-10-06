const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const timers = [];
const context = vm.createContext({ console, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {} });
for (const id of ['cubejs', 'appScript']) {
  const script = html.match(new RegExp(`<script id="${id}">\\n([\\s\\S]*?)\\n  </script>`));
  assert(script, `Missing embedded ${id} script`);
  vm.runInContext(script[1], context, { filename: id + '.js' });
}
const api = vm.runInContext(`({AppState, COLORS, PUZZLES, Cube, PuzzleValidators, createBlankState, createSolvedState,
  getPuzzleValidation, analyzeThreeByThreeCubies, parseAlgorithmMoves, cubeFaceletString, isSolvedPuzzleState,
  simulateAlgorithm, simulateMoveOnPuzzleState, inverseMove, cubeMovePermutation, pyraminxMovePermutation,
  buildCalculatedSolvePlan, reducedCubeState, buildPyraTables, buildGuidedLearningPlan, buildIndependentStudyPlan,
  independentFocusIndices, learningSolvedState, advancePlaybackState,
  select: type => { AppState.puzzleType=type; },
  setupPlayback: (type,state,plan) => {
    AppState.puzzleType=type; AppState.trainingProfile=null; AppState.playbackState=state.slice();
    AppState.activeStepIndex=0; AppState.activeMoveIndex=0;AppState.activeCaseIndex=0;
    AppState.completed=false; AppState.animating=false;AppState.playbackHistory=[]; CurrentAlgorithm=plan;
  }
})`, context);
function stateAfter(type, alg, state = api.createSolvedState(type)) {
  return api.simulateAlgorithm(type, state, api.parseAlgorithmMoves(alg));
}
function verifySolve(type, state) {
  const plan = api.buildCalculatedSolvePlan(type, state);
  assert(!plan[0].unsupported, `${type}: expected a computed solution`);
  assert(api.isSolvedPuzzleState(type, api.simulateAlgorithm(type, state, plan.flatMap(step => step.moves))), `${type}: moves must actually solve the scan`);
  return plan;
}
for (const type of Object.keys(api.PUZZLES)) {
  api.select(type);
  assert(api.PuzzleValidators[type](api.createSolvedState(type)));
  assert(!api.PuzzleValidators[type](api.createBlankState(type)));
  assert(!api.PuzzleValidators[type](api.createSolvedState(type).concat('#ffffff')));
  const wrong = api.createSolvedState(type); wrong[0] = '#123456';
  assert(!api.PuzzleValidators[type](wrong));
  assert.throws(() => api.buildCalculatedSolvePlan(type, wrong));
  assert.equal(verifySolve(type, api.createSolvedState(type))[0].moves.length, 0);
}
assert.equal(api.parseAlgorithmMoves("RUR'U' 2R2,3Rw2 Uw'").join(' '), "R U R' U' 2R2 3Rw2 Uw'");
assert.throws(() => api.parseAlgorithmMoves('R nonsense U'));
assert.throws(() => api.cubeMovePermutation('6Rw', 5));
assert.throws(() => api.pyraminxMovePermutation('R2'));
// Compare physical sticker movement to a separate cubie model, not just its inverse.
for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) for (const suffix of ['', "'", '2']) {
  const move = face + suffix;
  const next = stateAfter('3x3', move);
  assert.equal(api.cubeFaceletString(next), new api.Cube().move(move).asString(), `${move}: standard model mismatch`);
  assert(api.analyzeThreeByThreeCubies(next).valid, `${move}: legal turn rejected`);
}
let seed = 17;
const random = n => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed%n; };
for (let trial = 0; trial < 12; trial++) {
  const moves = Array.from({length:24}, () => ['U','R','F','D','L','B'][random(6)]+['',"'",'2'][random(3)]);
  const state = api.simulateAlgorithm('3x3', api.createSolvedState('3x3'), moves);
  assert(api.analyzeThreeByThreeCubies(state).valid);
  assert.equal(api.cubeFaceletString(state), new api.Cube().move(moves.join(' ')).asString());
  verifySolve('3x3', state);
}
for (const size of [3,4,5]) for (const face of ['U','R','F','D','L','B']) {
  const type = `${size}x${size}`, start = Array.from({length:6*size*size},(_,i)=>String(i));
  const moves = [face, ...(size>3?[face+'w','2'+face]:[]), ...(size===5?['3'+face+'w']:[])];
  for (const move of moves) {
    const permutation=api.cubeMovePermutation(move,size);
    assert.equal(new Set(permutation).size, start.length, `${type} ${move} is not a bijection`);
    assert.equal(api.simulateAlgorithm(type,start,[move,api.inverseMove(move)]).join('|'),start.join('|'));
    assert.equal(api.simulateAlgorithm(type,start,Array(4).fill(move)).join('|'),start.join('|'));
  }
}
for (const [name, mutate] of [
  ['twisted corner', s => { [s[8],s[27],s[20]]=[s[27],s[20],s[8]]; }],
  ['mirrored corner', s => { [s[27],s[20]]=[s[20],s[27]]; }],
  ['flipped edge', s => { [s[5],s[28]]=[s[28],s[5]]; }],
  ['odd edge swap', s => { [s[5],s[7]]=[s[7],s[5]];[s[28],s[19]]=[s[19],s[28]]; }],
  ['duplicate cubies', s => { [s[28],s[10]]=[s[10],s[28]]; }],
  ['duplicate centers', s => { [s[4],s[9]]=[s[9],s[4]]; }]
]) {
  const state=api.createSolvedState('3x3');mutate(state);
  assert(!api.analyzeThreeByThreeCubies(state).valid, `Must reject ${name}`);
}
assert.equal(api.buildPyraTables().edges.size,11520);
assert.equal(api.buildPyraTables().centers.size,81);
for (const move of ['U','L','R','B','u','l','r','b']) {
  const start=Array.from({length:36},(_,i)=>String(i)), permutation=api.pyraminxMovePermutation(move);
  assert.equal(new Set(permutation).size,36);
  assert.equal(permutation.filter((v,i)=>v!==i).length,move===move.toLowerCase()?3:12);
  assert.equal(api.simulateAlgorithm('pyraminx',start,Array(3).fill(move)).join('|'),start.join('|'));
  assert.equal(api.simulateAlgorithm('pyraminx',start,[move,api.inverseMove(move)]).join('|'),start.join('|'));
}
for (let trial=0;trial<12;trial++) {
  const moves=Array.from({length:20},()=>['U','L','R','B','u','l','r','b'][random(8)]+['',"'"][random(2)]);
  const state=api.simulateAlgorithm('pyraminx',api.createSolvedState('pyraminx'),moves);
  assert(api.PuzzleValidators.pyraminx(state)); verifySolve('pyraminx',state);
}
const rotatedColors=api.createSolvedState('pyraminx').map(c=>({ '#ffffff':'#ffff00','#ffff00':'#00ff00','#00ff00':'#ffffff','#0000ff':'#0000ff' })[c]);
verifySolve('pyraminx',stateAfter('pyraminx',"R U L B' u l'",rotatedColors));
const redPyraminx=api.createSolvedState('pyraminx').map(c=>c==='#ffffff'?'#ff0000':c);
verifySolve('pyraminx',stateAfter('pyraminx',"R U L B' u l'",redPyraminx));
const fiveColors=redPyraminx.slice();fiveColors[0]='#ffffff';assert(!api.PuzzleValidators.pyraminx(fiveColors));
const badPyra=api.createSolvedState('pyraminx');[badPyra[1],badPyra[9+3]]=[badPyra[9+3],badPyra[1]];
assert(!api.PuzzleValidators.pyraminx(badPyra));
for (const type of ['4x4','5x5']) {
  verifySolve(type,stateAfter(type,"R U F2 D' L B R2 U2"));
  verifySolve(type,stateAfter(type,"Rw U Fw'"));
}
const oll="Rw2 B2 U2 Lw U2 Rw' U2 Rw U2 F2 Rw F2 Lw' B2 Rw2", pll='2R2 U2 2R2 Uw2 2R2 Uw2';
for (const alg of [oll,pll,oll+' '+pll]) verifySolve('4x4',stateAfter('4x4',alg+" R U F2 D'"));
verifySolve('5x5',stateAfter('5x5',"2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2 R U F2"));
const unsupported=api.buildCalculatedSolvePlan('4x4',stateAfter('4x4',"Rw U Fw Lw D Bw Rw"));
assert(unsupported[0].unsupported && unsupported[0].moves.length===0, 'An unreduced scan must not receive lesson moves');
for (const type of Object.keys(api.PUZZLES)) {
  api.select(type);
  const guided=api.buildGuidedLearningPlan();
  if(type==='3x3') assert.equal(guided.length,8);
  for (const step of guided) for (const example of step.cases) {
    const baseline=api.learningSolvedState(type), moves=example.moves;
    assert(moves.length || example.name==='No parity');
    const prepared=api.simulateAlgorithm(type,baseline,moves.slice().reverse().map(api.inverseMove));
    assert(api.PuzzleValidators[type](prepared), `${type} ${example.name}: illegal lesson state`);
    assert.equal(api.simulateAlgorithm(type,prepared,moves).join('|'),baseline.join('|'));
  }
  const independent=api.buildIndependentStudyPlan();
  assert(independent.length>=3);
  for(const step of independent) {
    const indices=step.focusIndices;
    assert(indices.length>0 && indices.length<api.createSolvedState(type).length);
    assert.equal(new Set(indices).size,indices.length);
    assert(indices.every(i=>i>=0&&i<api.createSolvedState(type).length));
  }
}
// Playback regression: completion can't replay the final turn; undo restores cursor and state.
vm.runInContext('renderVisualFrame=()=>{};renderUIStatusDisplay=()=>{};triggerVisualPuzzleTurnAnimation=()=>{};showToast=()=>{};',context);
const start=stateAfter('3x3',"R U F2"), plan=verifySolve('3x3',start);
api.setupPlayback('3x3',start,plan);
for(const move of plan[0].moves) { api.advancePlaybackState('NEXT');while(timers.length) timers.shift()(); }
assert(api.AppState.completed);assert(api.isSolvedPuzzleState('3x3',api.AppState.playbackState));
const finish=api.AppState.playbackState.join('|'), historyLength=api.AppState.playbackHistory.length;
api.advancePlaybackState('NEXT');assert.equal(api.AppState.playbackState.join('|'),finish);assert.equal(api.AppState.playbackHistory.length,historyLength);
for(let i=0;i<historyLength;i++) api.advancePlaybackState('BACK');
assert.equal(api.AppState.playbackState.join('|'),start.join('|'));assert.equal(api.AppState.activeMoveIndex,0);
api.advancePlaybackState('BACK');assert.equal(api.AppState.playbackState.join('|'),start.join('|'));
assert(!/<(?:script|link)[^>]*(?:src|href)="https?:/i.test(html), 'App must run without external runtime resources');
console.log('verify: ok — geometry, legality, solving, parity, lessons, masking, playback, offline assets');
