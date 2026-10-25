const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync(chrome)?chrome:undefined)});
 try {
  const context=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const read=fn=>page.evaluate(fn),choose=async(type,mode='solve')=>{await page.click('#brandHome');await page.click(`[data-puzzle="${type}"]`);await page.click(`[data-mode="${mode==='study'?'learn':'solve'}"]`);};
  const paint=async(index,color)=>{await page.locator(`[data-brush="${color}"]`).click();await page.locator(`#scannerMesh [data-index="${index}"]`).click();};
  for(const [type,count] of [['2x2',24],['3x3',54],['4x4',96],['5x5',150],['pyraminx',36]]) {
   await choose(type);await paint(0,'#ff0000');await paint(count-1,'#0000ff');
   assert.equal(await page.locator('#scannerPreviewModel #cube3d, #scannerPreviewModel #pyra3d').count(),0);
   assert.equal(await page.locator('#scannerPreviewModel [data-preview-model]').count(),1);
   assert(await read(()=>{
    const state=AppState.colorDataMap[AppState.puzzleType];
    return [...document.querySelectorAll('#scannerPreviewModel [data-sticker-index], #scannerPreviewModel .pyra-piece3d')].every(n=>{
      const index=Number(n.dataset.stickerIndex??n.dataset.pyraIndex),color=n.dataset.pyraIndex===undefined?n.style.background:n.querySelector('.pyra-sticker3d').style.getPropertyValue('--sticker-color');
      const temp=document.createElement('span');temp.style.color=state[index];return color===state[index]||color===temp.style.color;
    });
   }),type+' preview must use the same input indices');
   const before=await read(()=>JSON.stringify(AppState.colorDataMap));await page.click('#inspectScanBack');await page.click('#inspectScanFront');assert.equal(await read(()=>JSON.stringify(AppState.colorDataMap)),before);
  }
  await choose('3x3');
  // Fixed outside-view corner coordinates, independent of cubeStickerGeometry.
  for(const [index,face,x,y,z] of [[0,'U',0,0,0],[9,'L',0,0,0],[18,'F',0,0,2],[27,'R',2,0,2],[36,'B',2,0,0],[38,'B',0,0,0],[45,'D',0,2,2],[47,'D',2,2,2]]) {
   assert.deepEqual(await page.locator(`#scannerPreviewModel [data-sticker-index="${index}"]`).evaluate(n=>{const p=n.closest('.cubie');return [n.dataset.face,+p.dataset.x,+p.dataset.y,+p.dataset.z];}),[face,x,y,z]);
  }
  await page.evaluate(()=>{const s=createSolvedState('3x3');[s[5],s[46]]=[s[46],s[5]];[s[28],s[48]]=[s[48],s[28]];AppState.colorDataMap['3x3']=s;renderScanner();validateAndUpdate();});
  await page.click('#validateBtn');
  const indices=await read(()=>[...new Set(AppState.scanner.issues.flatMap(i=>i.indices))].sort((a,b)=>a-b));
  const highlighted=async selector=>page.locator(selector).evaluateAll(ns=>ns.map(n=>Number(n.dataset.index??n.dataset.stickerIndex)).sort((a,b)=>a-b));
  assert.deepEqual(await highlighted('#scannerMesh .illegal-sticker-error'),indices);
  assert.deepEqual(await highlighted('#scannerPreviewModel .illegal-sticker-error'),indices);
  assert((await page.locator('#validationText').innerText()).includes('two yellow'));
  await page.click('#autoFillBtn');assert.equal(await page.locator('.illegal-sticker-error').count(),0);
  await choose('3x3','study');await page.click('[data-learn="independent"]');await page.click('#dismissStudyIntro');
  assert(!await page.locator('#advancedTools').evaluate(n=>n.open));assert(!await page.locator('#lessonDetails').evaluate(n=>n.open));
  assert(await page.locator('#chatPanel').isVisible());assert(await page.locator('#videoPanel').isVisible());
  assert.equal(await page.locator('#transportControls button:visible').count(),4);assert.equal(await page.locator('#modelPanel #transportControls').count(),1);
  assert(await page.locator('#playbackSpeed').isHidden());assert(await page.locator('#holdStudyPeek').isHidden());assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(remote,[]);
  const left=await page.locator('#modelPanel').boundingBox(),right=await page.locator('#lessonPanel').boundingBox();assert(left.x+left.width<=right.x);
  await page.click('#nextMove');assert(await page.locator('#algorithmPanel').isVisible());
  assert(await page.locator('#formulaDisplay').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=26));
  // Camera inspection must not shift the algorithm or video, nor alter any colors.
  await page.evaluate(()=>document.querySelector('#modelPanel').scrollIntoView({block:'start'}));
  assert((await page.locator('#chatForm').boundingBox()).y+(await page.locator('#chatForm').boundingBox()).height<=page.viewportSize().height);const algorithm=await page.locator('#algorithmPanel').boundingBox(),video=await page.locator('#videoPanel').boundingBox(),before=await read(()=>JSON.stringify([AppState.colorDataMap,AppState.playbackState,AppState.activeMoveIndex]));
  const cube=await page.locator('#visualFrame .cube-scene').boundingBox();await page.mouse.move(cube.x+cube.width*.3,cube.y+cube.height*.5);await page.mouse.down();await page.mouse.move(cube.x+cube.width*.3+55,cube.y+cube.height*.5+20);await page.mouse.up();
  assert(await read(()=>AppState.cameraY!==-34));assert.deepEqual(await page.locator('#algorithmPanel').boundingBox(),algorithm);assert.deepEqual(await page.locator('#videoPanel').boundingBox(),video);assert.equal(await read(()=>JSON.stringify([AppState.colorDataMap,AppState.playbackState,AppState.activeMoveIndex])),before);
  await page.locator('#chatInput').fill('what is the next move?');await page.keyboard.press('ArrowRight');await page.locator('#chatForm button').click();assert.equal(await read(()=>AppState.activeMoveIndex),0);assert((await page.locator('#chatLog').innerText()).includes('Current step:'));
  const conversation=await page.locator('#chatLog').innerText();await page.click('#chatClose');assert(await page.locator('#chatPanel').isVisible());
  await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Offline video fixture</title>'}));
  await page.click('#loadTutorialVideo');assert.equal(await page.locator('#tutorialVideoSlot iframe').count(),1);assert.equal(remote.length,1);assert(remote[0].startsWith('https://www.youtube-nocookie.com/embed/PW2J8IblczM?start='));
  const src=await page.locator('#tutorialVideoSlot iframe').getAttribute('src');await page.click('#nextMove');await page.waitForFunction(()=>!AppState.animating);assert.equal(await page.locator('#tutorialVideoSlot iframe').getAttribute('src'),src);assert.equal(remote.length,1);assert.equal(await page.locator('#chatLog').innerText(),conversation);
  await page.locator('#advancedTools > summary').click();await page.locator('#holdStudyPeek').focus();await page.keyboard.down('Space');assert(await read(()=>AppState.studyPeekHeld));await page.keyboard.up('Space');assert(!await read(()=>AppState.studyPeekHeld));await page.locator('#advancedTools > summary').click();
  await page.click('#playMove');assert(await page.locator('#playMove').isDisabled());await page.click('#pauseMove');await page.waitForFunction(()=>!AppState.animating);assert(!await read(()=>AppState.autoTimer));
  await page.screenshot({path:path.join(os.tmpdir(),'twisty-focus-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,document.querySelector('#playbackWorkspace').getBoundingClientRect().top+scrollY));
  assert(await page.locator('#visualFrame').evaluate(n=>getComputedStyle(n).overflow==='hidden'));await page.screenshot({path:path.join(os.tmpdir(),'twisty-focus-mobile.png'),fullPage:true});const mobile=await page.locator('#modelPanel').boundingBox();if(mobile.height>844*.55) console.log(await page.locator('#modelPanel').evaluate(n=>[n,...n.children,...n.querySelector('.sandbox-guidance').children].map(e=>({id:e.id,cls:e.className,height:e.getBoundingClientRect().height,min:getComputedStyle(e).minHeight}))));assert(mobile.y>=0&&mobile.y<20);assert(mobile.height<=844*.55);assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(os.tmpdir(),'twisty-focus-mobile.png'),fullPage:true});
  await page.click('#themeToggle');assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.click('#brandHome');assert.equal(await page.locator('iframe').count(),0);assert(await page.locator('#chatPanel').isHidden());assert.deepEqual(errors,[]);
  console.log('Focus console: five-puzzle live indices, independent orientation fixtures, shared diagnostics, separate playback controls, gear masking, stable two-panel layout, persistent local chat, explicit video loading/cleanup, mobile/dark and offline passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
