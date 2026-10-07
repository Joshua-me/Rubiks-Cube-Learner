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
  getPuzzleValidation, analyzeThreeByThreeCubies, analyzeTwoByTwoCorners, LEARNING_SOURCES, GuidedLearningLibrary, parseAlgorithmMoves, cubeFaceletString, isSolvedPuzzleState,
  simulateAlgorithm, simulateMoveOnPuzzleState, inverseMove, cubeMovePermutation, pyraminxMovePermutation,
  buildCalculatedSolvePlan, reducedCubeState, buildPyraTables, bigCubeModel, cycleTable, threeCycleMoves, validateBigCubeState, permuteState, compactSolutionMoves, buildGuidedLearningPlan, buildIndependentStudyPlan,
  independentFocusIndices, learningSolvedState, advancePlaybackState,
  executeNextPlaybackMove, showSolvedResult, restartSolvePlayback,
  select: type => { AppState.puzzleType=type; },
  setupPlayback: (type,state,plan) => {
    AppState.puzzleType=type; AppState.trainingProfile=null; AppState.playbackState=state.slice();AppState.playbackInitialState=state.slice();
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
// 2x2 corner turns agree with the independent 3x3 corner model.
for(let trial=0;trial<40;trial++) {
  const moves=Array.from({length:25},()=>['U','R','F','D','L','B'][random(6)]+['',"'",'2'][random(3)]);
  const state=api.simulateAlgorithm('2x2',api.createSolvedState('2x2'),moves), read=api.analyzeTwoByTwoCorners(state), standard=new api.Cube().move(moves.join(' ')).toJSON();
  assert(read.valid);
  assert.equal(read.cp.join(','),standard.cp.join(','));assert.equal(read.co.join(','),standard.co.join(','));verifySolve('2x2',state);
}
const oddTwo=api.createSolvedState('2x2'), first=[3,12,9], second=[2,8,5];
for(let i=0;i<3;i++) [oddTwo[first[i]],oddTwo[second[i]]]=[oddTwo[second[i]],oddTwo[first[i]]];
assert(api.PuzzleValidators['2x2'](oddTwo),'Odd 2x2 corner permutations are legal');verifySolve('2x2',oddTwo);
for(const mode of ['twist','mirror']) {
  const bad=api.createSolvedState('2x2');
  if(mode==='twist') [bad[3],bad[12],bad[9]]=[bad[12],bad[9],bad[3]];
  else [bad[12],bad[9]]=[bad[9],bad[12]];
  assert(!api.PuzzleValidators['2x2'](bad),`An isolated 2x2 corner ${mode} must be rejected`);
}
for(const size of [2,3,4,5]) for(const move of ['x','y','z',"x'",'y2']) {
  const type=`${size}x${size}`, state=stateAfter(type,move);
  assert(api.PuzzleValidators[type](state),`${type} ${move}: rotation must remain legal`);
  const identity=Array.from({length:6*size*size},(_,i)=>String(i));
  assert.equal(api.simulateAlgorithm(type,identity,[move,api.inverseMove(move)]).join('|'),identity.join('|'));
  if(size===3) {
    const colorToFace=Object.fromEntries(api.COLORS.cube.map((color,i)=>[color,['U','L','F','R','B','D'][i]]));
    const literal=[0,3,2,5,1,4].flatMap(face=>Array.from(state.slice(face*9,face*9+9),color=>colorToFace[color])).join('');
    assert.equal(literal,new api.Cube().move(move).asString(),`${move}: standard whole-cube rotation mismatch`);
  }
}
for (const size of [2,3,4,5]) for (const face of ['U','R','F','D','L','B']) {
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
verifySolve('4x4',stateAfter('4x4',"Rw U Fw Lw D Bw Rw"));

// Every directed three-cycle must be available and execute the requested permutation.
for(const size of [4,5]) {
  const model=api.bigCubeModel(size);
  for(const orbit of [model.wingOrbit,...model.centerOrbits]) {
    const table=api.cycleTable(model,orbit), projectedMoves=new Map();
    assert.equal(table.entries.length,4048);
    for(const entry of table.entries) {
      const triple=entry.triple, algorithm=api.threeCycleMoves(model,orbit,triple);
      let permutation=Array.from({length:24},(_,i)=>i);
      for(const move of algorithm) {
        if(!projectedMoves.has(move)) {
          const full=api.cubeMovePermutation(move,size);
          projectedMoves.set(move,Array.from(orbit.pieces,piece=>orbit.indexToPiece.get(full[piece[0]])));
        }
        permutation=api.permuteState(permutation,projectedMoves.get(move));
      }
      const expected=Array.from({length:24},(_,i)=>i);
      for(let i=0;i<3;i++) expected[triple[(i+1)%3]]=triple[i];
      assert.equal(permutation.join(','),expected.join(','),`${size} ${orbit.name}: incorrect conjugated three-cycle`);
    }
  }
  const type=`${size}x${size}`, families=['U','R','F','D','L','B','2R','2L','2U','2D','2F','2B','Rw','Lw','Uw','Dw','Fw','Bw',...(size===5?['3R','3U','3F','3Rw','3Uw','3Fw']:[])];
  for(let trial=0;trial<40;trial++) {
    const scramble=Array.from({length:45},()=>families[random(families.length)]+['',"'",'2'][random(3)]);
    const start=api.simulateAlgorithm(type,api.createSolvedState(type),scramble);
    assert(api.PuzzleValidators[type](start),`${type}: legal wide/inner scramble rejected`);
    const plan=verifySolve(type,start)[0];
    assert(plan.moves.length<1200,`${type}: unexpectedly large solution`);
    assert(plan.phases.length>0 && plan.phases[0].start===0 && plan.phases.at(-1).end===plan.moves.length);
  }
  // A corner cannot be twisted or mirrored independently on either big cube.
  for(const mutation of ['twist','mirror']) {
    const bad=api.createSolvedState(type), indices=[2*size+size-1,3*size*size,2*size*size+size-1];
    // URF indices: U bottom-right, R top-left, F top-right.
    indices[0]=size*size-1;
    if(mutation==='twist') [bad[indices[0]],bad[indices[1]],bad[indices[2]]]=[bad[indices[1]],bad[indices[2]],bad[indices[0]]];
    else [bad[indices[1]],bad[indices[2]]]=[bad[indices[2]],bad[indices[1]]];
    assert(!api.PuzzleValidators[type](bad),`${type}: impossible ${mutation} should be rejected`);
  }
  const reversedWing=api.createSolvedState(type), wing=model.wings[0];
  [reversedWing[wing[0]],reversedWing[wing[1]]]=[reversedWing[wing[1]],reversedWing[wing[0]]];
  assert(!api.PuzzleValidators[type](reversedWing),`${type}: single reversed wing should be rejected`);
}
// Uniform 4x4 centers can still be in the wrong color frame; that is legal and requires reduction.
for(const pair of [[0,1],[1,3]]) {
  const misplaced=api.createSolvedState('4x4');
  for(const local of [5,6,9,10]) {
    const a=pair[0]*16+local,b=pair[1]*16+local;[misplaced[a],misplaced[b]]=[misplaced[b],misplaced[a]];
  }
  assert(api.PuzzleValidators['4x4'](misplaced));
  assert(api.reducedCubeState('4x4',misplaced));
  verifySolve('4x4',misplaced);
}
const badOrbit=api.createSolvedState('5x5');[badOrbit[6],badOrbit[25+7]]=[badOrbit[25+7],badOrbit[6]];
assert(!api.PuzzleValidators['5x5'](badOrbit),'5x5 centers cannot move between diagonal and axial orbits');
const badMidge=api.createSolvedState('5x5');[badMidge[14],badMidge[75+2]]=[badMidge[75+2],badMidge[14]];
assert(!api.PuzzleValidators['5x5'](badMidge),'A single flipped 5x5 middle edge is impossible');

for (const type of Object.keys(api.PUZZLES)) {
  api.select(type);
  const guided=api.buildGuidedLearningPlan();
  if(type==='3x3') assert.equal(guided.length,8);
  for (const step of guided) for (const example of step.cases) {
    const baseline=api.learningSolvedState(type,step), moves=example.moves;
    assert(moves.length || example.setupMoves?.length, 'An inspection example requires a prepared state');
    const prepared=api.simulateAlgorithm(type,baseline,example.setupMoves||moves.slice().reverse().map(api.inverseMove));
    assert(api.PuzzleValidators[type](prepared), `${type} ${example.name}: illegal lesson state`);
    if(moves.length) assert.equal(api.simulateAlgorithm(type,prepared,moves).join('|'),baseline.join('|'));
    else assert(!api.isSolvedPuzzleState(type,prepared));
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
assert(api.LEARNING_SOURCES['3x3'].url.endsWith('PW2J8IblczM'));
assert(api.LEARNING_SOURCES['4x4'].url.endsWith('KWOZHbDdOeo'));
assert(api.LEARNING_SOURCES['5x5'].url.endsWith('d1I-jJlVwB4'));
assert(api.LEARNING_SOURCES.pyraminx.url.endsWith('pHBj8hixTfE'));
assert(api.LEARNING_SOURCES.pyraminx.alternatives[0].url.endsWith('sCJcd6FKWAc'));
api.select('3x3');assert.equal(api.buildGuidedLearningPlan().map(step=>step.videoSeconds).join(','),'53,144,289,413,426,494,577,677');
for(const type of ['2x2','3x3']) {
  api.select(type);const final=api.buildGuidedLearningPlan().at(-1), baseline=api.learningSolvedState(type,final), prepared=api.simulateAlgorithm(type,baseline,final.cases[0].moves.slice().reverse().map(api.inverseMove));
  const faceSize=api.PUZZLES[type].size**2;
  assert.equal(baseline[5*faceSize],'#ffff00','Final trigger lesson must hold yellow Down');
  assert(prepared.slice(0,faceSize).every(color=>color==='#ffffff'),'Prepared final twists must preserve the white Up layer');
}
// Alternate physical color schemes and center-frame rotations remain solvable.
for(const type of ['4x4','5x5']) for(const scheme of [
  {'#ffffff':'#ffffff','#ffaa00':'#ffaa00','#00ff00':'#0000ff','#ff0000':'#ff0000','#0000ff':'#00ff00','#ffff00':'#ffff00'},
  {'#ffffff':'#ffffff','#ffaa00':'#ffaa00','#00ff00':'#ffff00','#ff0000':'#ff0000','#0000ff':'#0000ff','#ffff00':'#00ff00'}
]) {
  const baseline=api.createSolvedState(type).map(color=>scheme[color]);
  verifySolve(type,stateAfter(type,"Rw U 2F Lw D Bw' 2R F2",baseline));
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
// Instant final-state inspection retains exact undo and restart semantics on long plans.
const bigStart=stateAfter('5x5',"Rw U Fw Lw D Bw Rw2 U' 2R 2U' F2 L B2 Dw"), bigPlan=verifySolve('5x5',bigStart);
api.setupPlayback('5x5',bigStart,bigPlan);api.showSolvedResult();
assert(api.AppState.completed && api.isSolvedPuzzleState('5x5',api.AppState.playbackState));
assert.equal(api.AppState.playbackHistory.length,bigPlan[0].moves.length);
api.advancePlaybackState('BACK');assert(!api.AppState.completed);
api.restartSolvePlayback();assert.equal(api.AppState.playbackState.join('|'),bigStart.join('|'));assert.equal(api.AppState.playbackHistory.length,0);
assert(!/<(?:script|link)[^>]*(?:src|href)="https?:/i.test(html), 'App must run without external runtime resources');
console.log('verify: ok — 2x2 solving, tutorial sources/chapters, whole-cube rotations, geometry, full legality, 20,240 three-cycles, 80 long big-cube scrambles, parity, lessons, masking, playback, offline assets');
