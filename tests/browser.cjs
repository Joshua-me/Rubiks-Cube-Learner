const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const macChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || (fs.existsSync(macChrome)?macChrome:undefined)});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:900},offline:true});
    const page=await context.newPage(), errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    const read=fn=>page.evaluate(fn);
    const settle=()=>page.waitForFunction(()=>!AppState.animating);
    const choose=async type=>{await page.click('#brandHome');await page.click(`[data-puzzle="${type}"]`);};
    assert.equal(await page.locator('[data-puzzle]').count(),5);
    assert.equal(await page.locator('#puzzleCards [data-preview-model="cube"]').count(),4);
    assert.equal(await page.locator('#puzzleCards [data-preview-model="pyraminx"]').count(),1);
    assert.equal(await page.locator('#puzzleCards svg').count(),0);
    assert.equal(await page.locator('#cube3d, #pyra3d').count(),0,'Homepage previews must not reuse playback IDs');
    if(process.argv.includes('--parity-banner')) {
      await choose('4x4');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      for(let i=0;i<5;i++) await page.click('#nextLesson');
      assert.equal(await page.locator('#parityPanel').evaluate(n=>n.previousElementSibling.textContent.trim()),'Your next step');
      assert((await page.locator('#parityPanel').innerText()).includes('4×4 OLL parity'));
      for(const text of ['Why it happens:','How to spot it:','prepared tutorial']) assert((await page.locator('#parityPanel').innerText()).includes(text));
      const initial=await read(()=>AppState.playbackState.join('|'));
      await page.click('#playMove');assert.equal(await read(()=>AppState.activeMoveIndex),0);assert(!await read(()=>AppState.autoTimer||AppState.animating));
      assert.equal(await read(()=>AppState.playbackState.join('|')),initial);
      assert(await page.locator('#resumeParity').isVisible());assert(await page.locator('#resetCamera').isEnabled());
      await page.click('#resumeParity');await page.waitForFunction(()=>AppState.animating);await page.click('#playMove');await settle();
      assert.equal(await read(()=>AppState.activeMoveIndex),1);
      await page.click('#playMove');await page.waitForFunction(()=>AppState.activeMoveIndex===2);await page.click('#playMove');await settle();
      assert.equal(await read(()=>AppState.parityPending),null,'Acknowledged parity must not pause on every move');
      await page.click('#restartCase');await page.click('#playMove');assert(await page.locator('#resumeParity').isVisible());
      await page.click('[data-case-index="1"]');assert((await page.locator('#parityPanel').innerText()).includes('4×4 PLL parity'));
      await page.click('[data-case-index="2"]');assert(await page.locator('#parityPanel').isHidden(),'A stage mentioning parity must not label ordinary cases as parity');
      await choose('5x5');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      for(let i=0;i<3;i++) await page.click('#nextLesson');await page.click('[data-case-index="2"]');
      assert((await page.locator('#parityPanel').innerText()).includes('5×5 last-edge parity'));
      assert((await page.locator('#parityPanel').innerText()).includes('does not have 4×4 PLL parity'));
      await page.click('#playMove');assert(await page.locator('#resumeParity').isVisible());
      await page.click('#nextMove');await settle();assert.equal(await read(()=>AppState.activeMoveIndex),1);assert.equal(await read(()=>AppState.parityPending),null);
      await page.click('#restartCase');await page.click('#watchPracticeSetup');await page.waitForFunction(()=>AppState.animating);
      assert(await page.locator('#parityPanel').isHidden(),'Reverse setup playback is not a parity correction');
      await choose('4x4');await page.click('[data-mode="solve"]');
      await page.evaluate(()=>{
        const alg="Rw2 B2 U2 Lw U2 Rw' U2 Rw U2 F2 Rw F2 Lw' B2 Rw2 2R2 U2 2R2 Uw2 2R2 Uw2 R U F2 D'";
        AppState.colorDataMap['4x4']=simulateAlgorithm('4x4',createSolvedState('4x4'),parseAlgorithmMoves(alg));renderScanner();validateAndUpdate();
      });
      await page.click('#solveBtn');await page.waitForFunction(()=>AppState.activeScreen==='playback',{},{timeout:60000});
      assert(await read(()=>CurrentAlgorithm[0].phases.some(p=>/OLL parity/.test(p.name))&&CurrentAlgorithm[0].phases.some(p=>/PLL parity/.test(p.name))));
      await page.click('#playMove');assert(await page.locator('#resumeParity').isVisible());
      await page.click('#resumeParity');await page.waitForFunction(()=>AppState.animating);await page.click('#playMove');await settle();
      const beforePLL=await read(()=>{
        const pll=CurrentAlgorithm[0].phases.find(p=>/PLL parity/.test(p.name));
        while(AppState.activeMoveIndex<pll.start-1) executeNextPlaybackMove();renderVisualFrame();renderUIStatusDisplay();
        return simulateAlgorithm('4x4',AppState.playbackInitialState,CurrentAlgorithm[0].moves.slice(0,pll.start)).join('|');
      });
      await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);
      assert((await page.locator('#parityPanel').innerText()).includes('4×4 OLL parity'),'Explain the in-progress turn, not the upcoming phase');
      await page.waitForFunction(()=>AppState.parityPending&&parityContext()?.kind==='pll'&&!AppState.animating&&!AppState.autoTimer);
      assert.equal(await read(()=>AppState.playbackState.join('|')),beforePLL,'Pause exactly before the first PLL move');
      assert((await page.locator('#parityPanel').innerText()).includes('4×4 PLL parity'));
      await page.setViewportSize({width:390,height:844});assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.click('#themeToggle');await page.screenshot({path:path.join(os.tmpdir(),'twisty-parity-banner.png'),fullPage:true});
      await page.click('#restartSolve');await page.click('#playMove');assert(await page.locator('#resumeParity').isVisible(),'Restart must request diagnosis again');
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');assert(await page.locator('#parityPanel').isHidden());
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — contextual OLL/PLL and 5x5 edge diagnostics below heading, pre-turn pause/resume, no repeated pauses, actual calculated parity boundary, setup/non-parity exclusions, restart, dark/mobile/offline');return;
    }
    if(process.argv.includes('--interlocks')) {
      const disabled=()=>read(()=>['nextLesson','previousLesson','resetCamera'].map(id=>document.getElementById(id).disabled));
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
      await page.selectOption('#playbackSpeed','normal');assert.deepEqual(await disabled(),[false,false,false]);
      assert.deepEqual(await read(()=>{toggleAutoPlay();return ['nextLesson','previousLesson','resetCamera'].map(id=>document.getElementById(id).disabled);}),[true,true,true],'Interlock must start before the first animation');
      await page.waitForFunction(()=>AppState.animating);assert.deepEqual(await disabled(),[true,true,true]);
      assert.equal(await read(()=>{selectLessonStep(1);selectLessonStep(-1);return AppState.activeStepIndex;}),1,'Programmatic navigation must honor the interlock');
      await page.waitForFunction(()=>!!AppState.autoTimer&&!AppState.animating&&AppState.activeMoveIndex===1);
      assert.deepEqual(await disabled(),[true,true,true],'Keep all controls disabled between moves');
      await page.evaluate(()=>{document.getElementById('nextLesson').click();document.getElementById('previousLesson').click();});assert.equal(await read(()=>AppState.activeStepIndex),1);
      await page.click('#playMove');await settle();assert.deepEqual(await disabled(),[false,false,false],'Paused playback must restore available controls');
      await page.click('#nextLesson');assert.equal(await read(()=>AppState.activeStepIndex),2);await page.click('#previousLesson');assert.equal(await read(()=>AppState.activeStepIndex),1);
      await page.selectOption('#playbackSpeed','normal');await page.click('#nextMove');assert.deepEqual(await disabled(),[true,true,true]);await settle();assert.deepEqual(await disabled(),[false,false,false]);
      await page.click('#playMove');await page.waitForFunction(()=>AppState.completed&&!AppState.animating&&!AppState.autoTimer);
      assert.deepEqual(await disabled(),[false,false,false],'Completion must release the interlock');
      await page.click('#previousLesson');assert.deepEqual(await disabled(),[false,true,false],'Keep first-lesson boundary restrictions');
      await page.evaluate(()=>selectLessonStep(CurrentAlgorithm.length-1));assert.deepEqual(await disabled(),[true,false,false],'Keep last-lesson boundary restrictions');
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — lesson/view control interlocks before and during turns, autoplay gaps, programmatic guards, pause/completion release and lesson boundaries');return;
    }
    if(process.argv.includes('--view-lock')) {
      const drag=async()=>{
        const box=await page.locator('#visualFrame .cube-scene').boundingBox();
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
        await page.mouse.move(box.x+box.width/2+90,box.y+box.height/2+30,{steps:5});await page.mouse.up();
      };
      for(const type of ['2x2','3x3','4x4','5x5']) {
        await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
        if(type==='3x3') await page.click('#nextLesson');
        await page.selectOption('#playbackSpeed','normal');
        const initial=await read(()=>AppState.playbackState.join('|'));
        const expected=await read(()=>simulateMoveOnPuzzleState(AppState.puzzleType,AppState.playbackState,activeMovesForStep(CurrentAlgorithm[AppState.activeStepIndex])[0]).join('|'));
        await drag();assert(await read(()=>AppState.cameraY!==-34));
        assert((await page.locator('#visibleFaces').innerText()).startsWith('Inspection view rotated'));
        assert.equal(await read(()=>AppState.playbackState.join('|')),initial,'Inspection must never remap notation or colors');
        await page.click('#nextMove');
        assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34]);
        assert(await page.locator('#resetCamera').isDisabled());
        await drag();assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34]);
        await settle();assert.equal(await read(()=>AppState.playbackState.join('|')),expected);
        assert.equal(await page.locator('#visualFrame').getAttribute('data-camera-locked'),'false');
        assert(await page.locator('#resetCamera').isEnabled());await drag();assert(await read(()=>AppState.cameraY!==-34));
        await page.click('#resetCamera');assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34]);
      }
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
      const box=await page.locator('#visualFrame .cube-scene').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
      await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2);
      const gripOnly=await read(()=>{const before=AppState.playbackState.join('|');toggleAutoPlay();return before===AppState.playbackState.join('|');});
      assert(gripOnly,'Restoring the playback grip must not apply a puzzle rotation');
      await page.mouse.move(box.x+box.width/2+95,box.y+box.height/2+35);await page.mouse.up();
      assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34],'A drag begun before Play must be canceled');
      await page.waitForFunction(()=>AppState.autoTimer&&!AppState.animating&&AppState.activeMoveIndex===1);
      assert.equal(await page.locator('#visualFrame').getAttribute('data-camera-locked'),'true');
      await drag();assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34],'Lock must cover gaps between turns');
      await page.evaluate(()=>resetWorkspaceCamera());assert(await page.locator('#resetCamera').isDisabled());
      await page.click('#playMove');assert(!await read(()=>workspaceCameraLocked()));await drag();assert(await read(()=>AppState.cameraY!==-34));
      await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);await page.click('#playMove');
      assert(await read(()=>workspaceCameraLocked()),'Pause must keep the view locked until the current turn finishes');
      await settle();assert(!await read(()=>workspaceCameraLocked()));
      await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);await page.click('#restartCase');
      assert(!await read(()=>workspaceCameraLocked()));assert.equal(await read(()=>AppState.activeMoveIndex),0);
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');await page.click('#nextMove');
      await drag();await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);
      assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34]);assert(await page.locator('#resetCamera').isDisabled());
      await page.click('#brandHome');assert(!await read(()=>workspaceCameraLocked()));
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — fixed-notation playback grip on all cube sizes, drag/reset lock during turns and autoplay gaps, in-flight drag cancellation, pause/resume/reset, independent demos and navigation');return;
    }
    if(process.argv.includes('--curriculum')) {
      const finish=()=>page.evaluate(()=>{while(executeNextPlaybackMove()) {}renderVisualFrame();renderUIStatusDisplay();});
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      await page.click('#continueLesson');
      assert.equal(await read(()=>activeMovesForStep(CurrentAlgorithm[0]).join(' ')),'U F2');
      for(const label of ['1. Hold:','2. Find:','3. Position:','4. Use:']) assert((await page.locator('#setupGuide').innerText()).includes(label));
      assert((await page.locator('#setupGuide').innerText()).includes('zero, one, two, or three'));
      await page.selectOption('#playbackSpeed','normal');await page.click('#playMove');
      await page.waitForFunction(()=>AppState.completed&&!AppState.animating);
      await page.click('#continueLesson');assert.equal(await read(()=>AppState.lessonPhase),'apply');
      assert.equal(await read(()=>AppState.activeCaseIndex),1,'Do not repeat the mental daisy after teaching alignment');
      assert(await read(()=>[1,3,5,7].every(i=>AppState.playbackState[i]==='#ffffff')));
      assert(await read(()=>activeMovesForStep(CurrentAlgorithm[0]).includes('U')));
      assert(!await read(()=>activeMovesForStep(CurrentAlgorithm[0]).includes('L2')));
      assert((await page.locator('#setupGuide').innerText()).includes('do not memorize'));
      while(!await read(()=>AppState.completed)) {
        assert(await read(()=>activeMovesForStep(CurrentAlgorithm[0])[AppState.activeMoveIndex]!=='F2'||AppState.playbackState[7]==='#ffffff'&&AppState.playbackState[19]===AppState.playbackState[22]));
        await page.click('#nextMove');await settle();
      }
      assert(await read(()=>isSolvedPuzzleState('3x3',AppState.playbackState)));
      await page.click('#continueLesson');assert.equal(await read(()=>AppState.activeStepIndex),1);
      assert((await page.locator('#relatedAlgorithms').innerText()).includes('Righty'));
      assert((await page.locator('#relatedAlgorithms').innerText()).includes('Lefty'));
      assert(!(await page.locator('#setupGuide').innerText()).includes('3. Position:'),'Teach the trigger before application placement');
      assert.equal(await page.locator('[data-case-index]').count(),2);
      await finish();await page.click('#continueLesson');assert.equal(await read(()=>AppState.lessonPhase),'teach');
      await finish();await page.click('#continueLesson');assert.equal(await read(()=>AppState.lessonPhase),'apply');
      assert.equal(await page.locator('[data-case-index]').count(),6);
      assert((await page.locator('#setupGuide').innerText()).includes('3. Position:'));
      for(let index=0;index<6;index++) {
        assert.equal(await read(()=>AppState.activeCaseIndex),index);
        assert((await page.locator('#setupGuide').innerText()).includes('Turn only U'));
        assert((await page.locator('#setupGuide').innerText()).includes('Finish all four moves'));
        if(index===2) await page.screenshot({path:path.join(os.tmpdir(),'twisty-white-up-case.png'),fullPage:true,animations:'disabled'});
        await finish();assert(await read(()=>isSolvedPuzzleState('3x3',AppState.playbackState)));
        await page.click('#continueLesson');
      }
      assert.equal(await read(()=>AppState.activeStepIndex),2);assert.equal(await read(()=>AppState.lessonPhase),'teach');
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — petal alignment before every F2, actual cross playback, Righty/Lefty teaching group, six separate corner applications, clear side guidance, correct phase/case transitions');return;
    }
    if(process.argv.includes('--study-play')) {
      for(const type of ['2x2','3x3','4x4','5x5','pyraminx']) {
        await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');
        while(!await read(()=>CurrentAlgorithm[AppState.activeStepIndex].studyMoves.length)) {
          assert.equal(await page.locator('#playMove').innerText(),'Mental step');
          assert(await page.locator('#playMove').isDisabled());await page.click('#nextMove');
        }
        const stage=await read(()=>AppState.activeStepIndex),prepared=await read(()=>AppState.playbackState.join('|'));
        assert(await page.locator('#playMove').isEnabled());
        await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);
        assert.equal(await read(()=>AppState.trainingProfile),'independent');
        assert.equal(await read(()=>AppState.activeStepIndex),stage,'Play must turn pieces, not advance the case');
        assert((await page.locator('#currentTurn').innerText()).startsWith('Turning:'));
        assert(await page.locator('#algorithmPanel').isVisible());
        if(await read(()=>!!AppState.autoTimer)) await page.click('#playMove');
        assert(!await read(()=>AppState.autoTimer),`${type}: Pause must stop autoplay`);await settle();
        assert.equal(await read(()=>AppState.activeMoveIndex),1);
        assert.notEqual(await read(()=>AppState.playbackState.join('|')),prepared);
        assert(await read(()=>{
          const step=CurrentAlgorithm[AppState.activeStepIndex];
          const expected=independentCaseFocusIndices(AppState.puzzleType,step,[...AppState.practiceSetupMoves,...step.studyMoves.slice(0,AppState.activeMoveIndex)]);
          return expected.join()===AppState.studyFocusIndices.join();
        }),'The cumulative mask must move with the actual pieces');
        await page.click('#restartStudyCase');assert.equal(await read(()=>AppState.playbackState.join('|')),prepared);
        await page.click('#nextMove');
        assert.equal(await read(()=>AppState.activeStepIndex),stage+1);
        await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),prepared);
      }
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');await page.click('#nextMove');
      await page.selectOption('#playbackSpeed','normal');await page.click('#playMove');
      await page.waitForFunction(()=>AppState.completed&&!AppState.animating,{},{timeout:40000});
      assert.equal(await page.locator('#playMove').innerText(),'Replay');assert(await page.locator('#playMove').isEnabled());
      assert(await read(()=>isSolvedPuzzleState('3x3',AppState.playbackState)));
      await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);assert.equal(await read(()=>AppState.activeMoveIndex),1);
      await page.click('#brandHome');assert(!await read(()=>AppState.animating||AppState.autoTimer));
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#continueLesson');
      await page.selectOption('#playbackSpeed','normal');await page.click('#playMove');
      await page.waitForFunction(()=>AppState.completed&&!AppState.animating,{},{timeout:15000});
      assert.equal(await page.locator('#playMove').innerText(),'Replay');await page.click('#playMove');await page.waitForFunction(()=>AppState.animating);
      await page.click('#brandHome');assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — independent Play/Pause and in-place moves on all five puzzles, moving cumulative masks, case navigation, reset, completion/replay, guided replay and navigation cancellation');return;
    }
    if(process.argv.includes('--motion')) {
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
      // Start in the same task as rendering: CSS transitions used to skip this turn.
      await page.evaluate(()=>{beginPracticeAlgorithm(false);advancePlaybackState('NEXT');});
      const moving=page.locator('#cube3d .cubie[data-x="2"][data-y="0"][data-z="2"]');
      const first=await moving.evaluate(n=>getComputedStyle(n).transform);
      await page.waitForTimeout(350);
      assert.notEqual(await moving.evaluate(n=>getComputedStyle(n).transform),first,'The visible piece must move between frames');
      assert.equal(await moving.evaluate(n=>n.getAnimations().length),1);
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-turn-in-progress.png')});
      await settle();await page.click('#backMove');
      assert.equal(await read(()=>AppState.activeMoveIndex),0);
      const failures=await page.evaluate(()=>{
        stopAutoPlay();cancelAnimation();const failures=[];
        for(const size of [2,3,4,5]) {
          AppState.puzzleType=`${size}x${size}`;
          const moves=['R',"R'",'U','D','F','B','L','R2','x',"y'",'z2',...(size>2?['Rw',"Uw'",'2R2']:[]),...(size===5?["3Rw'"]:[])];
          for(const move of moves) {
            $('#visualFrame').innerHTML=renderCube3D(size,createSolvedState(AppState.puzzleType));
            triggerVisualPuzzleTurnAnimation(move);
            const geometry=cubeStickerGeometry(size),permutation=cubeMovePermutation(move,size),scale=210/size,half=(size-1)/2;
            const pieces=[...$('#cube3d').querySelectorAll('.cubie')],initial=pieces.map(n=>new DOMMatrix(getComputedStyle(n).transform));
            const animations=turnAnimations.slice();animations.forEach(a=>a.pause());
            for(const fraction of [.25,.5,.75,1]) {
              animations.forEach(a=>a.currentTime=playbackTiming().turn*fraction);
              pieces.forEach((piece,index)=>{
                const m=new DOMMatrix(getComputedStyle(piece).transform),before=initial[index];
                if(Math.abs(Math.hypot(m.m41,m.m42,m.m43)-Math.hypot(before.m41,before.m42,before.m43))>.02) failures.push(`${size} ${move}: piece left its circular orbit`);
                if(fraction===1) piece.querySelectorAll('[data-sticker-index]').forEach(sticker=>{
                  const source=Number(sticker.dataset.stickerIndex),target=geometry[permutation[source]],normal=geometry[source].normal;
                  const p=[m.m41,m.m42,m.m43],n=m.transformPoint(new DOMPoint(...normal,0));
                  if(p.some((v,i)=>Math.abs(v-(target.position[i]-half)*scale)>.02)||[n.x,n.y,n.z].some((v,i)=>Math.abs(v-target.normal[i])>.001)) failures.push(`${size} ${move}: visual endpoint differs from move engine`);
                });
              });
            }
            cancelAnimation();
          }
        }
        AppState.puzzleType='pyraminx';AppState.showNet=false;
        $('#visualFrame').innerHTML=renderPyraminx3D(createSolvedState('pyraminx'));
        triggerVisualPuzzleTurnAnimation('R');
        if(turnAnimations.length!==12) failures.push('Pyraminx body turn must animate 12 stickers');
        const animation=turnAnimations[0],piece=animation.effect.target;animation.pause();animation.currentTime=200;
        const before=getComputedStyle(piece).transform;animation.currentTime=800;
        if(getComputedStyle(piece).transform===before) failures.push('Pyraminx must visibly rotate');
        cancelAnimation();if(piece.getAnimations().length) failures.push('Canceled turns must stop');
        return failures;
      });
      assert.deepEqual(failures,[]);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await read(()=>playbackTiming().turn),20,'Respect reduced-motion preference');
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — actual frame movement, first-paint playback, rigid circular turns and exact engine endpoints for all cube sizes, wide/inner/whole rotations, Pyraminx, undo/cancellation/reduced motion');return;
    }
    if(process.argv.includes('--scanner-review')) {
      for(const type of ['2x2','3x3','4x4','5x5','pyraminx']) {
        await choose(type);await page.click('[data-mode="solve"]');
        const perFace=await read(()=>faceletCountFor()), total=await page.locator('#scannerMesh .paintable').count();
        for(let i=0;i<perFace;i++) await page.locator(`#scannerMesh [data-index="${i}"]`).click();
        assert(await page.locator('#scannerMesh').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).m11>0),'Completion cue must not mirror the net');
        await page.locator(`#scannerMesh [data-index="${total-1}"]`).click();
        assert.equal(await read(()=>AppState.colorDataMap[AppState.puzzleType].at(-1)),'#ffffff');
        await page.click('#autoFillBtn');assert((await page.locator('#validationText').innerText()).includes('legality passed'));
        await page.click('#brandHome');assert.equal(await page.locator('#toastLayer .toast').count(),0);
      }
      await page.setViewportSize({width:390,height:844});await choose('3x3');await page.click('[data-mode="solve"]');
      await page.locator('#scannerMesh [data-index="53"]').click();assert.equal(await read(()=>AppState.colorDataMap['3x3'][53]),'#ffffff');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-scanner-reviewed.png'),fullPage:true,animations:'disabled'});
      assert.deepEqual(errors,[]);console.log('browser: ok — all scanner palettes keep Down stickers accessible, completion cue does not mirror, validation text and stale notices fixed');return;
    }
    if(process.argv.includes('--lesson-player')) {
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
      assert.equal(await read(()=>AppState.playbackSpeed),'slow');
      const prepared=await read(()=>AppState.playbackState.join('|'));
      assert((await page.locator('#setupGuide').innerText()).includes('white Up')===false);
      assert((await page.locator('#setupGuide').innerText()).includes('yellow on top'));
      assert.equal(await page.locator('#cube3d .setup-piece').count(),3);
      assert.equal(await page.locator('#cube3d .setup-slot').count(),3);
      await page.click('#toggleNet');assert.equal(await page.locator('#visualFrame .setup-piece').count(),3);await page.click('#toggleNet');
      await page.click('#watchPracticeSetup');await page.waitForFunction(()=>AppState.animating);
      assert.equal(await read(()=>AppState.practicePhase),'setup');
      assert((await page.locator('#currentTurn').innerText()).startsWith('Setup'));
      assert((await page.locator('#cube3d .cubie').first().evaluate(n=>getComputedStyle(n).transitionDuration)).includes('1.6s'));
      await page.waitForFunction(()=>AppState.completed&&!AppState.animating,{},{timeout:20000});
      assert.equal(await read(()=>AppState.playbackState.join('|')),prepared);
      assert(await page.locator('#continueLesson').isDisabled());assert(await page.locator('#playMove').isEnabled());
      await page.click('#startPracticeAlgorithm');await page.waitForFunction(()=>AppState.animating);
      assert.equal(await read(()=>AppState.practicePhase),'algorithm');
      await page.waitForTimeout(550);assert(await read(()=>AppState.animating),'Slow motion must slow the turn itself');
      assert(await page.locator('#cube3d .cubie').evaluateAll(nodes=>nodes.some(n=>n.getAnimations().some(a=>a.currentTime>100&&a.currentTime<1500))),'Slow playback must animate visible pieces');
      await page.click('#playMove');assert(!await read(()=>AppState.autoTimer));await settle();
      assert.equal(await read(()=>AppState.activeMoveIndex),1);
      await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),prepared);
      await page.selectOption('#playbackSpeed','very-slow');
      assert((await page.locator('#cube3d .cubie').first().evaluate(n=>getComputedStyle(n).transitionDuration)).includes('2.8s'));
      await page.click('#nextMove');await page.waitForTimeout(400);assert(await read(()=>AppState.animating));
      await page.click('#brandHome');assert(!await read(()=>AppState.animating||AppState.autoTimer));
      await choose('pyraminx');await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');
      for(let i=0;i<3;i++) await page.click('#nextMove');
      await page.click('#watchStudyDemo');assert.equal(await read(()=>AppState.trainingProfile),'guided');assert.equal(await read(()=>AppState.activeStepIndex),3);
      assert.equal(await read(()=>activeMovesForStep(CurrentAlgorithm[3]).join(' ')),"R' L R L' U' L' U L");
      assert(await page.locator('#setupGuide').isVisible());
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');await page.click('#nextLesson');
      assert.equal(await read(()=>AppState.setupDetails.targetIndices.join(',')),'23,30');
      assert((await page.locator('#setupGuide').innerText()).includes('green / orange'));
      await page.click('#themeToggle');
      assert.equal(await page.locator('#formulaDisplay .active').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(79, 70, 229)');
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-slow-setup.png'),fullPage:true,animations:'disabled'});
      assert.equal(external.length,0);assert.deepEqual(errors,[]);console.log('browser: ok — setup before algorithm, actual slow/very-slow turns, piece/slot markers, pause/undo/cancellation, independent demo links');return;
    }
    if(process.argv.includes('--daisy')) {
      await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      assert((await page.locator('#stepName').innerText()).includes('white cross'));
      assert(await read(()=>[1,3,5,7].every(i=>AppState.playbackState[i]==='#ffffff')&&AppState.playbackState[4]==='#ffff00'));
      assert((await page.locator('#lessonTeaching [data-mental-note]').innerText()).includes('solved mentally'));
      assert(await page.locator('#playMove').isDisabled());
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-daisy-guided.png'),fullPage:true,animations:'disabled'});
      await page.click('#continueLesson');assert.equal(await read(()=>AppState.activeCaseIndex),1);
      while(!await read(()=>AppState.completed)) {await page.click('#nextMove');await settle();}
      assert(await read(()=>[46,48,50,52].every(i=>AppState.playbackState[i]==='#ffffff')));
      assert(await read(()=>isSolvedPuzzleState('3x3',AppState.playbackState)));
      assert.deepEqual(errors,[]);assert.equal(external.length,0);console.log('browser: ok — White Cross opens with the daisy, visible mental note, then four-petal conversion');return;
    }
    if(process.argv.includes('--study')) {
      for(const type of ['2x2','3x3','4x4','5x5','pyraminx']) {
        await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');
        const count=await read(()=>CurrentAlgorithm.length);
        for(let stage=0;stage<count;stage++) {
          const before=await read(()=>AppState.playbackState.join('|'));
          const focus=await read(()=>AppState.studyFocusIndices.join(','));
          const matches=()=>page.evaluate(()=>{
            const step=CurrentAlgorithm[AppState.activeStepIndex], state=AppState.studyPreviewGoal?independentGoalState(AppState.puzzleType,step):AppState.playbackState;
            const targets=new Set(AppState.studyPreviewGoal?independentCaseFocusIndices(AppState.puzzleType,step,step.studyGoalSetupMoves):AppState.studyFocusIndices), cube=PUZZLES[AppState.puzzleType].kind==='cube';
            return Array.from(document.querySelectorAll(cube?'#visualFrame [data-sticker-index]':'#visualFrame [data-pyra-index]')).every(element=>{
              const index=Number(cube?element.dataset.stickerIndex:element.dataset.pyraIndex);
              const expected=!AppState.studyMaskEnabled||targets.has(index)?state[index]:COLORS.mask;
              const swatch=document.createElement('span');swatch.style.backgroundColor=expected;
              const color=cube?element.style.backgroundColor:element.querySelector('.pyra-sticker3d').style.getPropertyValue('--sticker-color');
              const actual=document.createElement('span');actual.style.backgroundColor=color;return actual.style.backgroundColor===swatch.style.backgroundColor;
            });
          });
          assert(await matches());
          if(type==='3x3'&&stage===0) {
            assert(await read(()=>[1,3,5,7].every(i=>AppState.playbackState[i]==='#ffffff')&&AppState.playbackState[4]==='#ffff00'));
            assert((await page.locator('#studyTaskPanel [data-mental-note]').innerText()).includes('solved mentally'));
            assert.equal(await read(()=>AppState.cameraX),-24);
          }
          await page.click('#previewStudyGoal');assert(await read(()=>AppState.studyPreviewGoal));assert(await matches());
          assert.equal(await read(()=>AppState.playbackState.join('|')),before);
          if(type==='3x3'&&stage===0) {
            assert(await page.locator('#cube3d [data-sticker-index]').evaluateAll(nodes=>[1,3,5,7].every(i=>nodes.find(n=>Number(n.dataset.stickerIndex)===i).style.backgroundColor==='rgb(255, 255, 255)')));
            await page.screenshot({path:path.join(os.tmpdir(),'twisty-white-cross-goal.png'),fullPage:true,animations:'disabled'});
          }
          await page.click('#previewStudyGoal');assert(!await read(()=>AppState.studyPreviewGoal));assert(await matches());
          assert.equal(await read(()=>AppState.playbackState.join('|')),before);
          if(type==='3x3'&&stage===0) assert(await read(()=>AppState.studyFocusIndices.some(i=>i<9&&AppState.playbackState[i]==='#ffffff')));
          await page.click('#toggleStudyMask');assert(!await read(()=>AppState.studyMaskEnabled));assert(await matches());
          assert.equal(await read(()=>AppState.playbackState.join('|')),before);
          await page.click('#toggleNet');
          assert(await page.locator('#visualFrame button').evaluateAll(nodes=>nodes.every(n=>n.style.backgroundColor!=='rgb(30, 30, 36)')));
          await page.click('#toggleStudyMask');
          assert.equal(await page.locator('#visualFrame button').evaluateAll(nodes=>nodes.filter(n=>n.style.backgroundColor==='rgb(30, 30, 36)').length),await read(()=>AppState.playbackState.length-AppState.studyFocusIndices.length));
          await page.click('#toggleNet');assert(await matches());assert.equal(await read(()=>AppState.playbackState.join('|')),before);
          if(type==='3x3'&&stage===0) await page.screenshot({path:path.join(os.tmpdir(),'twisty-study-targets.png'),fullPage:true,animations:'disabled'});
          if(stage<count-1) {
            await page.click('#nextMove');await page.click('#backMove');
            assert.equal(await read(()=>AppState.playbackState.join('|')),before);assert.equal(await read(()=>AppState.studyFocusIndices.join(',')),focus);await page.click('#nextMove');
          }
        }
      }
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — all independent cases follow target pieces, full/masked 3D and net comparison, exact case navigation');return;
    }
    if(process.argv.includes('--homepage')) {
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-home-3d.png'),fullPage:true,animations:'disabled'});
      for(const type of ['2x2','3x3','4x4','5x5','pyraminx']) {
        const card=page.locator(`[data-puzzle="${type}"]`);
        assert.equal(await card.locator('.sticker3d, .pyra-sticker3d').count(),type==='pyraminx'?36:6*Number(type[0])**2);
        await card.click();assert.equal(await read(()=>AppState.activeScreen),'mode');await page.click('#brandHome');
      }
      await page.setViewportSize({width:390,height:844});
      assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(os.tmpdir(),'twisty-home-3d-mobile.png'),fullPage:true,animations:'disabled'});
      await page.setViewportSize({width:1280,height:900});await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#continueLesson');
      const previewTransforms=await page.locator('#puzzleCards .cubie').evaluateAll(nodes=>nodes.map(n=>n.style.transform));
      await page.click('#nextMove');await settle();
      assert.deepEqual(await page.locator('#puzzleCards .cubie').evaluateAll(nodes=>nodes.map(n=>n.style.transform)),previewTransforms,'Playback must not turn homepage previews');
      assert.equal(await page.locator('#cube3d').count(),1);
      await choose('pyraminx');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      const tipPreview=await page.locator('#puzzleCards .pyra-piece3d').evaluateAll(nodes=>nodes.map(n=>n.style.transform));
      await page.click('#nextMove');await settle();
      assert.deepEqual(await page.locator('#puzzleCards .pyra-piece3d').evaluateAll(nodes=>nodes.map(n=>n.style.transform)),tipPreview);
      assert.equal(external.length,0);assert.deepEqual(errors,[]);
      console.log('browser: ok — five real 3D homepage previews, mobile layout, puzzle selection, isolated playback');return;
    }

    if(process.argv.includes('--palette')) {
      await choose('pyraminx');await page.click('[data-mode="solve"]');
      assert.equal(await page.locator('[data-brush]').count(),5);
      await page.click('[data-brush="#ff0000"]');await page.locator('#scannerMesh .paintable').first().click();
      assert.equal(await read(()=>AppState.colorDataMap.pyraminx[0]),'#ff0000');
      await page.evaluate(()=> {
        const start=createSolvedState('pyraminx').map(c=>c==='#ffffff'?'#ff0000':c);
        AppState.colorDataMap.pyraminx=simulateAlgorithm('pyraminx',start,['R','U',"L'",'b']);renderScanner();validateAndUpdate();
      });
      assert(await page.locator('#solveBtn').isEnabled());await page.click('#solveBtn');
      await page.waitForFunction(()=>AppState.activeScreen==='playback');
      while(!await read(()=>AppState.completed)) {await page.click('#nextMove');await settle();}
      assert(await read(()=>isSolvedPuzzleState('pyraminx',AppState.playbackState)));
      assert.deepEqual(errors,[]);assert.equal(external.length,0);
      console.log('browser: ok — optional red Pyraminx palette, painting, validation, worker solve, playback');return;
    }

    for(const [type,count] of [['2x2',24],['3x3',54],['4x4',96],['5x5',150],['pyraminx',36]]) {
      await choose(type);await page.click('[data-mode="solve"]');
      assert.equal(await page.locator('#scannerMesh .paintable').count(),count);
      assert(await page.locator('#solveBtn').isDisabled());
      await page.locator('#scannerMesh .paintable').first().click();
      assert.equal(await read(()=>AppState.colorDataMap[AppState.puzzleType].filter(c=>c!==COLORS.blank).length),1);
      await page.click('#autoFillBtn');assert(await page.locator('#solveBtn').isEnabled());
      if(type==='pyraminx') {
        assert(await read(()=>Array.from(document.querySelectorAll('.pyra-cell')).every(cell=>{
          const b=cell.getBoundingClientRect(),p=cell.parentElement.getBoundingClientRect();return b.bottom<=p.bottom+.1&&b.right<=p.right+.1;
        })), 'Triangular stickers must fit inside the face');
      }
      await page.click('#solveBtn');await page.waitForFunction(()=>AppState.activeScreen==='playback');
      assert(await page.locator('#nextMove').isDisabled());
      await page.click('#toggleNet');assert.equal(await page.locator('#visualFrame button').count(),count);await page.click('#toggleNet');
      await choose(type);await page.click('[data-mode="learn"]');
      const expectedTutorial={'2x2':'GANnG5a19kg','3x3':'PW2J8IblczM','4x4':'KWOZHbDdOeo','5x5':'d1I-jJlVwB4','pyraminx':'pHBj8hixTfE'}[type];
      assert((await page.locator('[data-tutorial-link]').first().getAttribute('href')).endsWith(expectedTutorial));
      if(type==='pyraminx') {assert.equal(await page.locator('[data-tutorial-link]').count(),2);assert((await page.locator('[data-tutorial-link]').nth(1).getAttribute('href')).endsWith('sCJcd6FKWAc'));}
      await page.click('[data-learn="guided"]');
      assert.equal(await read(()=>AppState.puzzleType),type);
      assert(await read(()=>!isSolvedPuzzleState(AppState.puzzleType,AppState.playbackState)));
      if(type==='2x2') await page.screenshot({path:path.join(os.tmpdir(),'twisty-2x2.png'),fullPage:true});
      if(type==='pyraminx') await page.screenshot({path:path.join(os.tmpdir(),'twisty-pyraminx.png'),fullPage:true});
      if(type==='3x3') {assert(await page.locator('#nextMove').isDisabled());await page.click('#continueLesson');}
      const baseline=await read(()=>AppState.playbackState.join('|'));
      await page.click('#nextMove');await settle();await page.click('#backMove');
      assert.equal(await read(()=>AppState.playbackState.join('|')),baseline);
      await page.click('#nextLesson');assert.equal(await read(()=>AppState.activeStepIndex),1);
      await page.click('#restartCase');assert.equal(await read(()=>AppState.activeMoveIndex),0);
      await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="independent"]');
      assert.equal(await read(()=>AppState.puzzleType),type);
      const independent=await read(()=>AppState.playbackState.join('|'));
      await page.click('#nextMove');assert.equal(await read(()=>AppState.activeStepIndex),1);
      await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),independent);
    }
    // Solid cubies use the exact solver geometry, with no duplicate or hidden stickers.
    for(const type of ['2x2','3x3','4x4','5x5']) {
      await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      assert(await read(()=>{
        const geometry=cubeStickerGeometry(PUZZLES[AppState.puzzleType].size), stickers=Array.from(document.querySelectorAll('#cube3d [data-sticker-index]'));
        return stickers.length===geometry.length && new Set(stickers.map(s=>s.dataset.stickerIndex)).size===geometry.length && stickers.every(sticker=>{
          const index=Number(sticker.dataset.stickerIndex), cubie=sticker.closest('.cubie'), color=document.createElement('span');color.style.backgroundColor=AppState.playbackState[index];
          return [cubie.dataset.x,cubie.dataset.y,cubie.dataset.z].map(Number).join()===geometry[index].position.join() && sticker.style.backgroundColor===color.style.backgroundColor && getComputedStyle(sticker.parentElement).backfaceVisibility==='hidden';
        }) && Array.from(document.querySelectorAll('#cube3d .cubie')).every(c=>c.querySelectorAll('.cubie-body').length===6);
      }));
    }
    await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
    const orbitState=await read(()=>AppState.playbackState.join('|'));
    const modelBox=await page.locator('#visualFrame .cube-scene').boundingBox();
    await page.mouse.move(modelBox.x+modelBox.width/2,modelBox.y+modelBox.height/2);await page.mouse.down();await page.mouse.move(modelBox.x+modelBox.width/2+70,modelBox.y+modelBox.height/2+20,{steps:8});await page.mouse.up();
    assert(await read(()=>AppState.cameraY!==-34));assert.equal(await read(()=>AppState.playbackState.join('|')),orbitState);
    await page.click('#resetCamera');assert.deepEqual(await read(()=>[AppState.cameraX,AppState.cameraY]),[-24,-34]);
    await page.click('#nextMove');
    assert((await page.locator('#currentTurn').innerText()).startsWith('Turning: R'));
    assert.equal(await page.locator('#formulaDisplay .active').innerText(),'R');
    await settle();assert((await page.locator('#currentTurn').innerText()).startsWith('Next: U'));
    await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),orbitState);
    const controls=await page.locator('#transportControls').boundingBox();assert(controls.y+controls.height<=900,'Cube controls must fit in the desktop viewport');
    assert(!await page.locator('#sourceDetails').evaluate(d=>d.open));
    assert(!await page.locator('#lessonExplanation').evaluate(d=>d.open));
    await page.setViewportSize({width:390,height:844});
    assert(await read(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile learning must not overflow');
    const mobileControls=await page.locator('#transportControls').boundingBox();assert(mobileControls.y+mobileControls.height<=844,'Mobile learning controls must fit with the cube');
    await page.screenshot({path:path.join(os.tmpdir(),'twisty-learning-mobile.png'),fullPage:true});
    await page.click('#toggleNet');assert(await read(()=>document.documentElement.scrollWidth<=innerWidth),'The all-face net must scroll inside its own panel');await page.click('#toggleNet');
    await page.setViewportSize({width:1280,height:900});
    // A real calculation crosses the Worker boundary, then physical turns reach solved.
    for(const type of ['2x2','3x3','pyraminx','4x4','5x5']) {
      await choose(type);await page.click('[data-mode="solve"]');
      await page.evaluate(()=>{
        const type=AppState.puzzleType,alg=type==='pyraminx'?"R U L' B R U' u l b'":"R U F2 D' L B R2 U2";
        AppState.colorDataMap[type]=simulateAlgorithm(type,createSolvedState(type),parseAlgorithmMoves(alg));renderScanner();validateAndUpdate();
      });
      await page.click('#solveBtn');await page.waitForFunction(()=>AppState.activeScreen==='playback',{},{timeout:60000});
      assert(await read(()=>CurrentAlgorithm[0].moves.length>0 && !CurrentAlgorithm[0].unsupported));
      while(!await read(()=>AppState.completed)) {await page.click('#nextMove');await settle();}
      assert(await read(()=>isSolvedPuzzleState(AppState.puzzleType,AppState.playbackState)));
      const finished=await read(()=>AppState.playbackState.join('|'));
      assert(await page.locator('#nextMove').isDisabled());
      await page.keyboard.press('ArrowRight');assert.equal(await read(()=>AppState.playbackState.join('|')),finished);
      await page.click('#backMove');assert(!await read(()=>AppState.completed));
    }
    // A stage teaches both related algorithms before introducing their applications.
    await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
    assert.equal(await read(()=>AppState.lessonPhase),'teach');
    assert((await page.locator('#lessonExplanation').textContent()).includes('righty and lefty'));
    assert(await page.locator('#continueLesson').isDisabled());
    await page.locator('#moveBreakdown summary').click();
    assert.equal(await page.locator('#lessonTeaching li').count(),4);
    const finishPractice=async()=>page.evaluate(()=>{while(executeNextPlaybackMove()){}renderVisualFrame();renderUIStatusDisplay();});
    await finishPractice();assert(!await page.locator('#continueLesson').isDisabled());
    await page.click('#continueLesson');assert.equal(await read(()=>AppState.activeCaseIndex),1);
    assert.equal(await read(()=>AppState.lessonPhase),'teach');assert.equal(await read(()=>AppState.playbackHistory.length),0);
    await finishPractice();await page.click('#continueLesson');
    assert.equal(await read(()=>AppState.lessonPhase),'apply');assert.equal(await read(()=>AppState.activeCaseIndex),0);
    assert((await page.locator('#lessonExplanation').textContent()).includes('Find the slot between the centers'));
    await page.click('#nextMove');await settle();assert.equal(await read(()=>AppState.playbackHistory.length),1);
    await page.click('#reviewAlgorithm');assert.equal(await read(()=>AppState.lessonPhase),'teach');
    assert.equal(await read(()=>AppState.playbackHistory.length),0);assert.equal(await read(()=>AppState.activeMoveIndex),0);
    await finishPractice();await page.click('#continueLesson');await finishPractice();await page.click('#continueLesson');
    await finishPractice();await page.click('#continueLesson');assert.equal(await read(()=>AppState.activeCaseIndex),1);
    while(await read(()=>AppState.activeStepIndex===1)) {await finishPractice();await page.click('#continueLesson');}
    assert.equal(await read(()=>AppState.activeStepIndex),2);
    assert.equal(await read(()=>AppState.lessonPhase),'teach');
    // Final twisting teaches the reusable trigger before the full application.
    await page.evaluate(()=>selectLessonStep(5));
    assert.equal(await read(()=>activeMovesForStep(CurrentAlgorithm[7]).length),4);
    await finishPractice();await page.click('#continueLesson');
    assert.equal(await read(()=>AppState.lessonPhase),'apply');
    assert(await read(()=>activeMovesForStep(CurrentAlgorithm[7]).includes('D')));
    assert.equal(await page.locator('#continueLesson').innerText(),'Finish this application');
    await finishPractice();assert.equal(await page.locator('#continueLesson').innerText(),'Learning complete');
    await page.screenshot({path:path.join(os.tmpdir(),'twisty-stage-application.png'),fullPage:true});
    // Named videos, chapter links, inspection steps, and source rotation notation.
    await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
    assert((await page.locator('#sourceChapterLink').getAttribute('href')).endsWith('&t=53s'));
    for(let i=0;i<3;i++) await page.click('#nextLesson');
    assert(await page.locator('#playMove').isDisabled());
    assert(!await read(()=>isSolvedPuzzleState('3x3',AppState.playbackState)));
    assert((await page.locator('#sourceChapterLink').getAttribute('href')).endsWith('&t=413s'));
    await page.click('#nextLesson');assert(await page.locator('#playMove').isEnabled());
    await choose('pyraminx');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');await page.click('#nextLesson');
    assert((await page.locator('[data-source-link]').getAttribute('href')).endsWith('sCJcd6FKWAc'));
    assert((await page.locator('#sourceChapterLink').getAttribute('href')).endsWith('&t=13s'));
    await choose('4x4');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
    for(let i=0;i<5;i++) await page.click('#nextLesson');
    for(let i=0;i<2;i++) {await page.click('#nextMove');await settle();}
    const beforeRotation=await read(()=>AppState.playbackState.join('|'));
    assert((await page.locator('#moveInstruction').innerText()).includes('whole cube'));
    await page.click('#nextMove');await settle();assert.notEqual(await read(()=>AppState.playbackState.join('|')),beforeRotation);
    await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),beforeRotation);
    await choose('5x5');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
    for(let i=0;i<3;i++) await page.click('#nextLesson');await page.click('[data-case-index="2"]');
    assert((await page.locator('#sourceChapterLink').getAttribute('href')).endsWith('&t=386s'));
    assert(await read(()=>activeMovesForStep(CurrentAlgorithm[AppState.activeStepIndex]).includes("3Rw'")));
    // Full unreduced scans calculate in an offline Worker and show every reduction phase.
    for(const type of ['4x4','5x5']) {
      await choose(type);await page.click('[data-mode="solve"]');
      await page.evaluate(()=> {
        const type=AppState.puzzleType, moves=parseAlgorithmMoves("Rw U Fw Lw D Bw Rw2 U' 2R 2U' F2 L B2 Dw");
        AppState.colorDataMap[type]=simulateAlgorithm(type,createSolvedState(type),moves);renderScanner();validateAndUpdate();
      });
      assert(await page.locator('#solveBtn').isEnabled());
      assert(await read(()=>!reducedCubeState(AppState.puzzleType,AppState.colorDataMap[AppState.puzzleType])));
      await page.click('#solveBtn');await page.waitForFunction(()=>AppState.activeScreen==='playback',{},{timeout:60000});
      assert(await read(()=>CurrentAlgorithm[0].moves.length>100));
      assert.equal(await page.locator('#formulaDisplay .notation-pill').count(),21);
      assert(await page.locator('#solutionPhases').innerText().then(text=>text.includes('centers')));
      const start=await read(()=>AppState.playbackState.join('|'));
      await page.click('#nextMove');await page.click('#toggleNet');
      assert(!await read(()=>AppState.animating));assert(await page.locator('#nextMove').isEnabled());
      await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),start);await page.click('#toggleNet');
      assert(await page.locator('#moveInstruction').innerText().then(text=>text.includes('counting inward')));
      await page.click('#nextMove');await settle();assert.equal(await read(()=>AppState.activeMoveIndex),1);
      await page.click('#backMove');assert.equal(await read(()=>AppState.playbackState.join('|')),start);
      await page.click('#finishSolve');assert(await read(()=>AppState.completed&&isSolvedPuzzleState(AppState.puzzleType,AppState.playbackState)));
      assert.equal(await read(()=>AppState.playbackHistory.length),await read(()=>CurrentAlgorithm[0].moves.length));
      await page.click('#backMove');assert(!await read(()=>AppState.completed));
      await page.click('#restartSolve');assert.equal(await read(()=>AppState.playbackState.join('|')),start);
      assert.equal(await read(()=>AppState.activeMoveIndex),0);
      if(type==='5x5') await page.screenshot({path:path.join(os.tmpdir(),'twisty-big-cube.png'),fullPage:true});
    }

    // Autoplay stops at the end, typing in the coach doesn't trigger playback.
    await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
    await page.click('#continueLesson');await page.click('#playMove');await page.waitForFunction(()=>AppState.completed&&!AppState.autoTimer);
    await page.click('#backMove');await page.click('#chatToggle');
    const cursor=await read(()=>AppState.activeMoveIndex);
    await page.locator('#chatInput').fill('what does Rw mean?');await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
    assert.equal(await read(()=>AppState.activeMoveIndex),cursor);assert(!await read(()=>!!AppState.autoTimer));
    await page.click('#chatClose');
    // Cancel before the first worker response; subsequent scans still work.
    await choose('3x3');await page.click('[data-mode="solve"]');
    await page.evaluate(()=>{
      AppState.colorDataMap['3x3']=simulateAlgorithm('3x3',createSolvedState('3x3'),['R','U','F']);validateAndUpdate();
      startPlayback();setView('dashboard');
    });
    assert(!await read(()=>AppState.solving));
    await choose('3x3');await page.click('[data-mode="solve"]');assert(await page.locator('#solveBtn').isEnabled());
    await page.click('#themeToggle');assert(await read(()=>document.documentElement.classList.contains('dark')));
    await page.setViewportSize({width:390,height:844});
    await choose('pyraminx');await page.click('[data-mode="solve"]');await page.click('#autoFillBtn');
    assert.equal(await read(()=>document.documentElement.scrollWidth<=window.innerWidth),true, 'Mobile shell must not overflow');
    await page.screenshot({path:process.env.SCREENSHOT_PATH||path.join(os.tmpdir(),'twisty-mobile.png'),fullPage:true});
    assert.equal(external.length,0,'Offline app must not request remote assets');assert.deepEqual(errors,[]);
    console.log('browser: ok — offline scanners, five-puzzle worker solves, tutorial links/chapters, rotations, full big-cube reduction, playback/undo, autoplay, cancellation, learning, keyboard, mobile');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
