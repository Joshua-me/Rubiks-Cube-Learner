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
    assert.equal(await page.locator('[data-puzzle]').count(),4);
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

    for(const [type,count] of [['3x3',54],['4x4',96],['5x5',150],['pyraminx',36]]) {
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
      await choose(type);await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
      assert.equal(await read(()=>AppState.puzzleType),type);
      assert(await read(()=>!isSolvedPuzzleState(AppState.puzzleType,AppState.playbackState)));
      if(type==='pyraminx') await page.screenshot({path:path.join(os.tmpdir(),'twisty-pyraminx.png'),fullPage:true});
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
    // A real calculation crosses the Worker boundary, then physical turns reach solved.
    for(const type of ['3x3','pyraminx','4x4','5x5']) {
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
    // Autoplay stops at the end, typing in the coach doesn't trigger playback.
    await choose('3x3');await page.click('[data-mode="learn"]');await page.click('[data-learn="guided"]');
    await page.click('#playMove');await page.waitForFunction(()=>AppState.completed&&!AppState.autoTimer);
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
    console.log('browser: ok — offline scanners, worker solves, playback/undo, autoplay, cancellation, learning, keyboard, mobile');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
