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
  independentFocusIndices, independentCaseFocusIndices, regripStudyFocus, independentGoalState, practiceSetupDetails, PYRA_STICKERS, learningSolvedState, advancePlaybackState,
  executeNextPlaybackMove, showSolvedResult, restartSolvePlayback, parityContext, diagnoseScan, nextEmptyScanIndex, scanPieceGroups,
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
// Scanner explanations must be accurate for real piece constraints and must
// never flag legal scans (including legal big-cube parity or alternate frames).
for(const type of Object.keys(api.PUZZLES)) {
  const moves=type==='pyraminx'?"R U L' B r u'":"R U F2 L' D B R2";
  const state=stateAfter(type,moves);
  assert.equal(api.diagnoseScan(type,state).length,0,`${type}: legal scan falsely highlighted`);
  const allowed=api.PUZZLES[type].colors;
  const recolored=state.map(color=>allowed[(allowed.indexOf(color)+1)%allowed.length]);
  assert.equal(api.diagnoseScan(type,recolored).length,0,`${type}: alternate legal frame falsely highlighted`);
}
const scannerBlank=api.createBlankState('3x3');
assert.equal(api.nextEmptyScanIndex(scannerBlank),0);scannerBlank[0]='#ff0000';assert.equal(api.nextEmptyScanIndex(scannerBlank,0),1);
const cursorWrap=api.createSolvedState('3x3');cursorWrap[0]=api.COLORS.blank;assert.equal(api.nextEmptyScanIndex(cursorWrap,53),0);cursorWrap[0]='#ffffff';assert.equal(api.nextEmptyScanIndex(cursorWrap),-1);
const countScan=api.createSolvedState('3x3');countScan[0]='#ffff00';
const countIssue=api.diagnoseScan('3x3',countScan).find(issue=>issue.kind==='count');
assert.equal(countIssue.certainty,'review');assert.equal(countIssue.indices.length,10);assert(countIssue.indices.every(index=>countScan[index]==='#ffff00'));
const sameEdge=api.createSolvedState('3x3');[sameEdge[5],sameEdge[46]]=[sameEdge[46],sameEdge[5]];[sameEdge[28],sameEdge[48]]=[sameEdge[48],sameEdge[28]];
const repeated=api.diagnoseScan('3x3',sameEdge).find(issue=>issue.kind==='repeated-color');
assert(repeated.message.includes('two yellow'));assert.deepEqual(Array.from(repeated.indices),[5,28]);assert.equal(repeated.certainty,'exact');
const mirroredScan=api.createSolvedState('3x3');[mirroredScan[8],mirroredScan[27]]=[mirroredScan[27],mirroredScan[8]];
assert.deepEqual(Array.from(api.diagnoseScan('3x3',mirroredScan).find(issue=>issue.kind==='mirrored').indices),[8,20,27]);
const flipScan=api.createSolvedState('3x3');[flipScan[7],flipScan[19]]=[flipScan[19],flipScan[7]];
const globalIssue=api.diagnoseScan('3x3',flipScan).find(issue=>issue.kind==='reachability');
assert.equal(globalIssue.certainty,'review');assert.equal(globalIssue.indices.length,24);assert(globalIssue.message.includes('cannot identify a single wrong sticker'));
const fixedCenterScan=api.createSolvedState('3x3');[fixedCenterScan[4],fixedCenterScan[10]]=[fixedCenterScan[10],fixedCenterScan[4]];
assert.deepEqual(Array.from(api.diagnoseScan('3x3',fixedCenterScan).find(issue=>issue.kind==='centers').indices),[4,13]);
const orbitScan=api.createSolvedState('5x5');[orbitScan[6],orbitScan[32]]=[orbitScan[32],orbitScan[6]];
assert(api.diagnoseScan('5x5',orbitScan).some(issue=>issue.kind==='center-orbit'));
assert.equal(api.diagnoseScan('4x4',stateAfter('4x4',"Rw2 B2 U2 Lw U2 Rw' U2 Rw U2 F2 Rw F2 Lw' B2 Rw2")).length,0,'Legal 4x4 OLL parity must not be highlighted as invalid');
assert.equal(api.diagnoseScan('3x3',null)[0].kind,'length');
const unknownScan=api.createSolvedState('3x3');unknownScan[0]='#123456';assert(api.diagnoseScan('3x3',unknownScan).some(issue=>issue.kind==='palette'&&issue.indices.includes(0)));

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
  for(const step of guided) {
    assert(step.algorithmCases.length,'Every stage needs a separate teaching group');
    assert.notEqual(step.algorithmCases,step.cases,'Teaching and applications must have separate case lists');
    const algorithms=step.algorithmCases.map(example=>example.teachingMoves.join(' '));
    assert.equal(new Set(algorithms).size,algorithms.length,'Do not reteach the same trigger for every application');
    for(const example of step.algorithmCases) {
      const moves=example.teachingMoves,baseline=api.learningSolvedState(type,step);
      const prepared=api.simulateAlgorithm(type,baseline,moves.slice().reverse().map(api.inverseMove));
      assert(api.PuzzleValidators[type](prepared));
      assert.equal(api.simulateAlgorithm(type,prepared,moves).join(),baseline.join());
    }
  }
  for (const step of guided) for (const example of step.cases) {
    assert(step.goal && step.explanation && step.application, `${type}: both teaching and application instructions are required`);
    const teaching=example.teachingMoves;
    assert(Array.isArray(teaching));
    const teachingBaseline=api.learningSolvedState(type,step);
    const teachingSetup=api.simulateAlgorithm(type,teachingBaseline,teaching.slice().reverse().map(api.inverseMove));
    assert(api.PuzzleValidators[type](teachingSetup), `${type} ${example.name}: illegal teaching state`);
    assert.equal(api.simulateAlgorithm(type,teachingSetup,teaching).join('|'),teachingBaseline.join('|'));
    const baseline=api.learningSolvedState(type,step), moves=example.moves;
    assert(moves.length || example.setupMoves?.length, 'An inspection example requires a prepared state');
    const prepared=api.simulateAlgorithm(type,baseline,example.setupMoves||moves.slice().reverse().map(api.inverseMove));
    assert(api.PuzzleValidators[type](prepared), `${type} ${example.name}: illegal lesson state`);
    if(moves.length) assert.equal(api.simulateAlgorithm(type,prepared,moves).join('|'),baseline.join('|'));
    else assert(!api.isSolvedPuzzleState(type,prepared));
  }
  const independent=api.buildIndependentStudyPlan();
  assert(independent.length>=3);
  if(type==='3x3') {
    assert.deepEqual(Array.from(new Set(independent.map(step=>step.guidedStageIndex))),[0,1,2,3,4,5,6,7], 'Independent 3x3 must cover all eight source stages in order');
    assert.equal(independent.length,guided.reduce((sum,lesson)=>sum+lesson.cases.length,0), 'Every 3x3 application case must be available without Guided Learning');
    guided.forEach((lesson,stage)=>{
      const cases=independent.filter(step=>step.guidedStageIndex===stage);
      assert.deepEqual(Array.from(cases,step=>step.studyCaseName),Array.from(lesson.cases,example=>example.name));
      cases.forEach((step,index)=>{
        assert.equal(step.studyStageCount,8);assert.equal(step.studyCaseIndex,index);assert.equal(step.studyCaseCount,cases.length);
        assert.equal(step.studyMoves.join(' '),lesson.cases[index].moves.join(' '));
      });
    });
  }

  assert.equal(independent.at(-1).focusIndices.length,api.createSolvedState(type).length,`${type}: the final step must reveal the complete puzzle`);
  for(const step of independent) {
    const indices=step.focusIndices;
    assert(indices.length>0 && indices.length<=api.createSolvedState(type).length);
    assert.equal(new Set(indices).size,indices.length);
    assert(indices.every(i=>i>=0&&i<api.createSolvedState(type).length));
    for(const previous of independent.slice(0,independent.indexOf(step))) {
      const carried=api.regripStudyFocus(type,previous.focusIndices,previous,step);
      assert(carried.every(i=>indices.includes(i)),`${type}: an earlier piece was hidden in a later step or regrip`);
    }
    const baseline=api.learningSolvedState(type,step), setup=step.studySetupMoves||step.studyMoves.slice().reverse().map(api.inverseMove);
    const prepared=api.simulateAlgorithm(type,baseline,setup), focus=api.independentCaseFocusIndices(type,step,setup);
    assert.equal(focus.length,indices.length);
    // Target sticker colors must be conserved as those pieces move out of their solved slots.
    assert.equal(focus.map(i=>prepared[i]).sort().join(','),indices.map(i=>baseline[i]).sort().join(','), `${type}: study mask lost or substituted target stickers`);
    assert(api.PuzzleValidators[type](prepared), `${type}: independent case must remain legal`);
    if(type==='3x3'&&step.studyIndex===0) {
      assert([1,3,5,7].every(i=>prepared[i]==='#ffffff'),'White-cross starts with all four daisy petals on Up');
      assert.equal(prepared[4],'#ffff00','Daisy has a yellow center');
      const goal=api.independentGoalState(type,step);
      if(step.mentalStep) assert([1,3,5,7].every(i=>goal[i]==='#ffffff'));
      else assert([46,48,50,52].every(i=>goal[i]==='#ffffff'));
      assert(step.mentalNote.includes('mentally'));

    }

  }
}
// Creator algorithm contracts and independently observable piece effects.
const niklas=api.GuidedLearningLibrary['3x3'][6].cases[0].moves;
assert.equal(niklas.join(' '),"R U' L' U R' U' L U");
api.select('3x3');
const niklasBase=api.learningSolvedState('3x3'), niklasResult=api.simulateAlgorithm('3x3',niklasBase,niklas);
for(const i of [6,11,18]) assert.equal(niklasResult[i],niklasBase[i],'CubeHead Niklas must keep the front-left corner fixed');
for(const example of api.GuidedLearningLibrary['3x3'][2].cases) {
  const result=api.simulateAlgorithm('3x3',niklasBase,example.moves);
  for(const i of [45,46,47,48,49,50,51,52,53,15,16,17,24,25,26,33,34,35,42,43,44]) assert.equal(result[i],niklasBase[i],'Middle-layer insertion must preserve the whole white first layer');
}
api.select('3x3');const middleLessons=api.buildGuidedLearningPlan()[2];
for(const [index,expected] of [[0,'23,30'],[1,'14,21']]) {
  api.AppState.activeCaseIndex=index;const example=middleLessons.cases[index], state=api.simulateAlgorithm('3x3',niklasBase,example.moves.slice().reverse().map(api.inverseMove));
  assert.equal(api.practiceSetupDetails('3x3',middleLessons,state).targetIndices.join(','),expected,'Choose the insertion side from its case, not the opposite trigger in its title');
}
api.AppState.activeCaseIndex=0;
api.select('3x3');
const crossLesson=api.buildGuidedLearningPlan()[0],crossCase=crossLesson.cases[1],crossBase=api.learningSolvedState('3x3',crossLesson);
let crossState=api.simulateAlgorithm('3x3',crossBase,crossCase.moves.slice().reverse().map(api.inverseMove));
assert([1,3,5,7].every(i=>crossState[i]==='#ffffff'),'The complete cross application must start with four daisy petals');
assert(crossCase.moves.includes('U')&&crossCase.moves.filter(m=>m==='F2').length===4,'Teach alignment, not four already-aligned side turns');
crossCase.moves.forEach(move=>{
  if(move==='F2') assert(crossState[7]==='#ffffff'&&crossState[19]===crossState[22],'Never insert a petal before its side sticker matches the front center');
  crossState=api.simulateAlgorithm('3x3',crossState,[move]);
});
assert.equal(crossState.join(),crossBase.join());
const firstLayer=api.buildGuidedLearningPlan()[1];
assert.equal(firstLayer.algorithmCases.length,2);assert.equal(firstLayer.cases.length,6);
for(const example of firstLayer.cases) {
  const state=api.simulateAlgorithm('3x3',crossBase,example.moves.slice().reverse().map(api.inverseMove));
  const left=example.name.startsWith('Left'),face=example.name.split('faces ')[1];
  const index=face==='up'?(left?6:8):face==='front'?(left?18:20):left?11:27;
  assert.equal(state[index],'#ffffff',`${example.name}: the model must match its stated white-sticker direction`);
  for(const i of [46,25,48,16,50,34,52,43]) assert.equal(state[i],crossBase[i],`${example.name}: retain the solved white cross`);
  assert(example.hold&&example.recognize&&example.place&&example.use);
}
const pyraRight=api.GuidedLearningLibrary.pyraminx[3].cases[0].moves,pyraLeft=api.GuidedLearningLibrary.pyraminx[3].cases[1].moves;
assert.equal(pyraRight.join(' '),"R' L R L' U' L' U L");assert.equal(pyraLeft.join(' '),"L R' L' R U R U' R'");
for(const moves of [pyraRight,pyraLeft]) assert.equal(api.simulateAlgorithm('pyraminx',api.createSolvedState('pyraminx'),moves).slice(0,9).join(),api.createSolvedState('pyraminx').slice(0,9).join(),'Paradox Case 1 preserves the complete base');
api.select('pyraminx');
const centerLesson=api.buildGuidedLearningPlan()[1], centerPrepared=api.simulateAlgorithm('pyraminx',api.learningSolvedState('pyraminx',centerLesson),centerLesson.cases[0].moves.slice().reverse().map(api.inverseMove));
const centerSetup=api.practiceSetupDetails('pyraminx',centerLesson,centerPrepared);
assert(centerSetup.pieceIndices.every(i=>api.PYRA_STICKERS[i].kind==='center'),'Center setup must highlight axial centers, not same-colored tips');
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
for(const [type,name,kind] of [['4x4','Correct 4x4 OLL parity','oll'],['4x4','Correct 4x4 PLL parity','pll'],['5x5','Correct wing permutation parity','wing'],['5x5','Correct PLL parity',null]]) {
  api.setupPlayback(type,api.createSolvedState(type),[{moves:['U'],phases:[{name,start:0,end:1}]}]);
  assert.equal(api.parityContext()?.kind||null,kind);
  api.AppState.activeMoveIndex=1;assert.equal(api.parityContext(),null,'Finished phases must not retain a diagnostic');
}
assert(!/<(?:script|link)[^>]*(?:src|href)="https?:/i.test(html), 'App must run without external runtime resources');
const cameraPayload=html.match(/<script id="opencvBundle"[^>]*>\s*([\s\S]*?)\s*<\/script>/);
assert(cameraPayload,'Camera scanning needs its offline OpenCV payload');
const opencv=require('node:zlib').gunzipSync(Buffer.from(cameraPayload[1].trim(),'base64'));
assert.equal(require('node:crypto').createHash('sha256').update(opencv).digest('hex'),'63366510248adf3a7eddf3e793dd825404efb7df3749f4d6f8557c7fa4ca8aa0','Embedded OpenCV must match the pinned official build');
assert.equal(html.match(/<script id="cameraVision"[^>]*>\s*([\s\S]*?)\s*<\/script>/)[1].trim(),fs.readFileSync(path.join(__dirname,'scripts/camera-vision-worker.js'),'utf8').trim(),'Run npm run build:camera after editing the worker');
assert(html.includes(fs.readFileSync(path.join(__dirname,'vendor/OPENCV-LICENSE.txt'),'utf8').trim()),'Preserve the embedded OpenCV license');
console.log('verify: ok — 2x2 solving, tutorial sources/chapters, whole-cube rotations, geometry, full legality, 20,240 three-cycles, 80 long big-cube scrambles, parity, lessons, masking, playback, offline assets');
