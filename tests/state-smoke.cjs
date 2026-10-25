// Small offline routing contract tests. No camera, solver-table generation,
// screenshots, or network access; the full engine/browser suites cover those.
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const appURL=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
let browser,context,page,errors,requests;

before(async()=>{
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync(chrome)?chrome:undefined)});
});
after(async()=>{await browser?.close();});
beforeEach(async()=>{
  context=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:1280,height:900}});
  page=await context.newPage();errors=[];requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  page.setDefaultTimeout(5000);
  await page.goto(appURL);
});
afterEach(async()=>{
  try {assert.deepEqual(errors,[],'No browser exceptions');assert.deepEqual(requests,[],'No remote runtime dependencies');}
  finally {await context.close();}
});
const read=fn=>page.evaluate(fn);
const input=()=>read(()=>AppState.colorDataMap);
const workspace=()=>read(()=>({colors:AppState.playbackState.slice(),cursor:AppState.activeMoveIndex,step:AppState.activeStepIndex,completed:AppState.completed}));
const choose=async(type,mode='solve')=>{
  await page.click('#brandHome');await page.click(`[data-puzzle="${type}"]`);await page.click(`[data-mode="${mode==='study'?'learn':'solve'}"]`);
};
const brush=async color=>{await page.locator(`[data-brush="${color}"]`).click();};
const paint=async index=>{await page.locator(`#scannerMesh [data-index="${index}"]`).click();};
const advanced=async()=>{await page.locator('#lessonDetails').evaluate(n=>n.open=true);if(!await page.locator('#advancedTools').evaluate(n=>n.open))await page.locator('#advancedTools > summary').click();};
const dismiss=async()=>{if(await page.locator('#studyIntroDialog').isVisible())await page.click('#dismissStudyIntro');};
const study=async()=>{await choose('3x3','study');await page.click('[data-learn="independent"]');await dismiss();};
const settle=()=>page.waitForFunction(()=>!AppState.animating);

test('routing rejects unconfigured or unvalidated progression without modifying any input',async()=>{
  const original=await input();
  assert(await page.locator('[data-wizard-step="2"]').isDisabled());
  assert(await page.locator('[data-wizard-step="3"]').isDisabled());
  await page.evaluate(()=>{navigateWizard(3);setView('playback');});
  assert.equal(await read(()=>AppState.activeScreen),'dashboard');
  await choose('3x3');await brush('#ff0000');await paint(0);
  const edited=await input();assert.notDeepEqual(edited,original);
  await page.evaluate(()=>{navigateWizard(3);setView('playback');});
  assert.equal(await read(()=>AppState.activeScreen),'scanner');assert.deepEqual(await input(),edited);
  assert(await page.locator('#solveBtn').isDisabled());
});

test('all five puzzle matrices and the sticky brush survive routing and mobile rerendering independently',async()=>{
  const expected=await input();
  for(const [type,length] of [['2x2',24],['3x3',54],['4x4',96],['5x5',150],['pyraminx',36]]) {
    await choose(type);assert.equal(expected[type].length,length);
    await brush('#ff0000');await paint(0);expected[type][0]='#ff0000';
    await brush('#00ff00');await paint(length-1);expected[type][length-1]='#00ff00';
    assert.deepEqual(await input(),expected,`${type} painting must affect only its two selected cells`);
  }
  await page.setViewportSize({width:390,height:844});
  for(const type of ['5x5','pyraminx','2x2','4x4','3x3']) {
    await choose(type);
    assert.deepEqual(await input(),expected,`${type} route must restore its saved matrix`);
    assert.equal(await read(()=>AppState.selectedPaintBrush),'#00ff00');
    assert.equal(await page.locator('#palette [aria-pressed="true"]').getAttribute('data-brush'),'#00ff00');
    const cells=page.locator('#scannerMesh [data-index]');assert.equal(await cells.count(),expected[type].length);
    assert.equal(await cells.first().evaluate(n=>n.style.backgroundColor),'rgb(255, 0, 0)');
    assert.equal(await cells.last().evaluate(n=>n.style.backgroundColor),'rgb(0, 255, 0)');
    assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
  }
});

test('validation and route rebuilding preserve input and brush while invalidating stale progression',async()=>{
  await choose('3x3');await page.click('#autoFillBtn');
  const solved=await input();assert(await page.locator('[data-wizard-step="3"]').isEnabled());
  await brush('#ffff00');await paint(0);
  const invalid=await input();assert(await page.locator('[data-wizard-step="3"]').isDisabled());
  await page.click('#validateBtn');assert.equal(await page.locator('#scanFeedback').getAttribute('data-status'),'error');
  assert((await page.locator('#validationText').innerText()).includes('10 yellow'));
  assert.deepEqual(await input(),invalid,'Validation cannot repair or rewrite entered colors');
  await page.click('[data-wizard-step="1"]');await page.click('[data-wizard-step="2"]');
  assert.deepEqual(await input(),invalid);assert.equal(await read(()=>AppState.selectedPaintBrush),'#ffff00');
  assert(await page.locator('[data-wizard-step="3"]').isDisabled());
  await brush('#ffffff');await paint(0);assert.deepEqual(await input(),solved);
  assert(await page.locator('[data-wizard-step="3"]').isEnabled());
  // Complete counts still must not unlock an impossible single flipped edge.
  await page.evaluate(()=>{const s=AppState.colorDataMap['3x3'];[s[7],s[19]]=[s[19],s[7]];renderScanner();validateAndUpdate();});
  const impossible=await input();await page.click('#validateBtn');
  assert.equal(await page.locator('#scanFeedback').getAttribute('data-status'),'error');
  assert(await page.locator('[data-wizard-step="3"]').isDisabled());
  assert.deepEqual(await input(),impossible);
});

test('study entry and rendering tools never overwrite saved scans or apply puzzle moves',async()=>{
  await choose('3x3');await brush('#ff0000');await paint(0);const saved=await input();
  await study();const prepared=await workspace();
  assert.equal(await page.locator('#visualFrame [data-sticker-index]').count(),54);
  assert(await page.locator('#visualFrame .study-masked').count()>0);
  await advanced();
  await page.click('#toggleStudyMask');await page.click('#toggleStudyMask');
  await page.click('#toggleNet');assert.equal(await page.locator('#visualFrame button[data-index]').count(),54);
  await page.click('#toggleNet');await page.click('#previewStudyGoal');await page.click('#previewStudyGoal');
  await page.evaluate(()=>{AppState.cameraY=120;updateCamera();});await page.click('#resetCamera');await page.click('#themeToggle');
  await advanced();await page.locator('#holdStudyPeek').focus();await page.keyboard.down('Space');await page.keyboard.up('Space');
  assert.deepEqual(await workspace(),prepared,'Camera, masking, preview, net and theme are display-only');
  assert.deepEqual(await input(),saved,'Practice must never alias the scanner matrix');
  await choose('3x3');assert.deepEqual(await input(),saved);
  assert.equal(await read(()=>AppState.selectedPaintBrush),'#ff0000');
  assert.equal(await page.locator('#scannerMesh [data-index="0"]').evaluate(n=>n.style.backgroundColor),'rgb(255, 0, 0)');
});

test('multi-step study advances once, undoes exactly and starts each new case with fresh history',async()=>{
  await study();const saved=await input();
  assert.equal(await read(()=>AppState.activeStepIndex),0);
  assert(await page.locator('#backMove').isDisabled());
  await page.click('#nextMove');assert.equal(await read(()=>AppState.activeStepIndex),1);
  const prepared=await workspace();assert.equal(prepared.cursor,0);
  await page.click('#nextMove');await settle();
  assert.equal(await read(()=>AppState.activeMoveIndex),1);assert.equal(await read(()=>AppState.activeStepIndex),1);
  assert.notDeepEqual((await workspace()).colors,prepared.colors);
  await page.click('#backMove');assert.deepEqual(await workspace(),prepared);
  const count=await read(()=>activeMovesForStep(CurrentAlgorithm[AppState.activeStepIndex]).length);
  for(let i=0;i<count;i++){await page.click('#nextMove');await settle();}
  assert.equal(await read(()=>AppState.activeMoveIndex),count);assert(await read(()=>AppState.completed));
  assert.equal(await page.locator('#nextMove').innerText(),'Next step');
  await page.click('#nextMove');assert.equal(await read(()=>AppState.activeStepIndex),2);
  assert(await page.locator('#studyIntroDialog').isVisible());await dismiss();
  assert((await page.locator('#lessonPhaseHud').innerText()).startsWith('Step 2:'));
  assert.equal(await read(()=>AppState.activeMoveIndex),0);assert.equal(await read(()=>AppState.playbackHistory.length),0);
  await advanced();await page.click('#previousStudyCase');await dismiss();
  assert.equal(await read(()=>AppState.activeStepIndex),1);assert.deepEqual(await workspace(),prepared);
  assert.deepEqual(await input(),saved);
});

test('leaving during a turn or scheduled autoplay cancels stale updates without changing the saved scan',async()=>{
  await study();await page.click('#nextMove');const saved=await input();
  // One JS task guarantees navigation really interrupts the active animation.
  await page.evaluate(()=>{primaryNextMove();if(!AppState.animating)throw Error('Fixture did not start a turn');setView('learn');});
  const stopped=await workspace();
  assert(!await read(()=>AppState.animating||AppState.autoTimer));
  await page.waitForTimeout(220); // Exceeds reduced-motion completion and autoplay's initial 150ms timer.
  assert.deepEqual(await workspace(),stopped);assert.equal(await read(()=>AppState.activeScreen),'learn');
  await page.click('[data-learn="independent"]');await dismiss();await page.click('#nextMove');
  await page.evaluate(()=>{toggleAutoPlay();if(!AppState.autoTimer)throw Error('Fixture did not schedule autoplay');setView('mode');});
  const pending=await workspace();await page.waitForTimeout(220);
  assert.deepEqual(await workspace(),pending);assert(!await read(()=>AppState.animating||AppState.autoTimer||AppState.studyPeekHeld));
  assert.deepEqual(await input(),saved);
});
