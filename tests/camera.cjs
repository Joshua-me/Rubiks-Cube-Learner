const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const context=await browser.newContext({offline:true,viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
    await page.addInitScript(()=>{
      window.cameraMock={streams:[],canvases:[],deny:false,delay:false};
      Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async constraints=>{
        window.cameraMock.constraints=constraints;
        if(window.cameraMock.deny) throw new DOMException('Denied','NotAllowedError');
        if(window.cameraMock.delay) await new Promise(resolve=>window.cameraMock.resolvePermission=resolve);
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
        const context=canvas.getContext('2d');context.fillStyle='#cbd5e1';context.fillRect(0,0,640,480);
        const stream=canvas.captureStream(12);window.cameraMock.canvases.push(canvas);window.cameraMock.streams.push(stream);
        return stream;
      }});
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    const choose=async(type)=>{await page.click('#brandHome');await page.click(`[data-puzzle="${type}"]`);await page.click('[data-mode="solve"]');};
    const draw=async(size,colors,triangle=false,skew=false)=>page.evaluate(({size,colors,triangle,skew})=>{
      const canvas=window.cameraMock.canvases.at(-1),ctx=canvas.getContext('2d');
      const render=()=>{
        ctx.fillStyle='#cbd5e1';ctx.fillRect(0,0,640,480);ctx.save();ctx.translate(160,80);if(skew) ctx.transform(1,.08,.12,.95,0,0);
        if(!triangle) {
          ctx.fillStyle='#111111';ctx.fillRect(0,0,312,312);
          for(let row=0;row<size;row++) for(let col=0;col<size;col++) {ctx.fillStyle=colors[row*size+col];ctx.fillRect(col*312/size+5,row*312/size+5,312/size-10,312/size-10);}
        } else {
          const w=312,h=270;ctx.fillStyle='#111111';ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
          const cells=[[1/3,0],[1/6,1/3],[1/3,1/3],[1/2,1/3],[0,2/3],[1/6,2/3],[1/3,2/3],[1/2,2/3],[2/3,2/3]];
          cells.forEach(([x,y],i)=>{const inverted=[2,5,7].includes(i),points=inverted?[[x*w,y*h],[(x+1/3)*w,y*h],[(x+1/6)*w,(y+1/3)*h]]:[[(x+1/6)*w,y*h],[(x+1/3)*w,(y+1/3)*h],[x*w,(y+1/3)*h]];
            const cx=points.reduce((s,p)=>s+p[0],0)/3,cy=points.reduce((s,p)=>s+p[1],0)/3;ctx.beginPath();points.forEach((p,j)=>{const px=cx+(p[0]-cx)*.86,py=cy+(p[1]-cy)*.86;j?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();});
        }
        ctx.restore();
      };
      if(window.cameraMock.drawTimer) clearInterval(window.cameraMock.drawTimer);render();window.cameraMock.drawTimer=setInterval(render,80);
    },{size,colors,triangle,skew});
    const start=async()=>{await page.click('#startCamera');await page.waitForFunction(()=>AppState.camera.running||(!AppState.camera.starting&&document.querySelector('#cameraStatus').textContent.includes('could not')),{},{timeout:40000});assert(await page.evaluate(()=>AppState.camera.running),await page.locator('#cameraStatus').innerText());};
    const palette=['#ffffff','#ffaa00','#00ff00','#ff0000','#0000ff','#ffff00'];
    for(const size of process.argv.includes('--pyraminx')?[]:[2,3,4,5]) {
      console.log(`camera: checking ${size}x${size}`);
      await choose(`${size}x${size}`);await start();
      if(size===2||size===3) {
        const wrong=size===2?3:2;await draw(wrong,Array.from({length:wrong*wrong},(_,i)=>palette[i%6]));await page.waitForTimeout(1400);
        assert.equal(await page.evaluate(()=>AppState.camera.faces.length),0,'Do not accept a grid for the wrong puzzle size');
      }
      if(size===3) {
        await draw(3,Array(9).fill('#b020d0'));await page.waitForFunction(()=>document.querySelector('#cameraStatus').textContent.includes('colors are uncertain'));
        assert(await page.evaluate(()=>AppState.colorDataMap['3x3'].every(c=>c===COLORS.blank)),'Unsupported color clusters must not overwrite stickers');
      }
      const colors=Array.from({length:size*size},(_,i)=>palette[i%6]);await draw(size,colors,false,size===4);
      await page.waitForFunction(()=>AppState.camera.faces.length===1,{},{timeout:20000}).catch(async error=>{console.log(await page.evaluate(()=>({status:document.querySelector('#cameraStatus').textContent,stable:AppState.camera.stable,candidate:AppState.camera.candidate,busy:AppState.camera.busy})));await page.locator('#cameraPreview').screenshot({path:path.join(os.tmpdir(),'twisty-camera-failed.png')});throw error;});
      assert.deepEqual(await page.evaluate(()=>AppState.colorDataMap[AppState.puzzleType].slice(0,faceletCountFor())),colors,`${size}: row-major colors must fill the actual workspace`);
      assert(await page.locator('#solveBtn').isDisabled(),'Partial camera scans must not bypass validation');
      assert.equal(await page.evaluate(()=>AppState.camera.waiting),true,'Do not scan the same image into the next face automatically');
      await page.click('#undoCameraFace');assert(await page.evaluate(()=>AppState.colorDataMap[AppState.puzzleType].every(c=>c===COLORS.blank)));
      if(size===3) {const shaded=['#ece7d7','#ed8814','#22994a','#c82521','#224ca7','#e8db27'];await draw(size,colors.map(c=>shaded[palette.indexOf(c)]));}
      await page.click('#nextCameraFace');await page.waitForFunction(()=>AppState.camera.faces.length===1,{},{timeout:20000});
      assert.deepEqual(await page.evaluate(()=>AppState.colorDataMap[AppState.puzzleType].slice(0,faceletCountFor())),colors,'Map shaded color clusters back to exact palette values');
      await page.click('#stopCamera');assert(await page.evaluate(()=>window.cameraMock.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
    }
    await choose('pyraminx');await start();await page.evaluate(()=>{const receive=receiveCameraDetection;receiveCameraDetection=data=>{window.cameraMock.lastDetection=data;receive(data);};});const pyra=['#ff0000','#00ff00','#0000ff','#ffff00','#ff0000','#00ff00','#0000ff','#ffff00','#ff0000'];await draw(3,pyra,true);
    await page.waitForFunction(()=>AppState.camera.faces.length===1,{},{timeout:20000}).catch(async error=>{console.log(JSON.stringify(await page.evaluate(()=>({status:document.querySelector('#cameraStatus').textContent,last:window.cameraMock.lastDetection}))));await page.locator('#cameraPreview').screenshot({path:path.join(os.tmpdir(),'twisty-camera-pyra-failed.png')});throw error;});
    assert.deepEqual(await page.evaluate(()=>AppState.colorDataMap.pyraminx.slice(0,9)),pyra,'Pyraminx triangular cells must use scanner row order and optional red');
    await page.click('#brandHome');assert(await page.evaluate(()=>!AppState.camera.running&&window.cameraMock.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
    // A real complete solved scan through all six selected faces reaches validation.
    await choose('3x3');await start();
    for(let face=0;face<6;face++) {
      await draw(3,Array(9).fill(palette[face]));
      if(face) {await page.selectOption('#cameraFace',String(face));await page.click('#nextCameraFace');}
      await page.waitForFunction(face=>AppState.camera.faces.includes(face),face,{timeout:20000});
    }
    assert(await page.locator('#solveBtn').isEnabled());
    assert(await page.evaluate(()=>isSolvedPuzzleState('3x3',AppState.colorDataMap['3x3'])));
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(os.tmpdir(),'twisty-camera-mobile.png'),fullPage:true});
    await page.click('#resetPaintBtn');assert(await page.evaluate(()=>!AppState.camera.running&&AppState.camera.history.length===0&&AppState.colorDataMap['3x3'].every(c=>c===COLORS.blank)));
    // Missing grids never overwrite a scan, and denial can be retried.
    await start();await page.waitForTimeout(1400);assert(await page.evaluate(()=>AppState.colorDataMap['3x3'].every(c=>c===COLORS.blank)));
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert(await page.evaluate(()=>!AppState.camera.running&&window.cameraMock.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),'Hiding the page must stop the camera');
    await start();await page.locator('#scannerMesh .paintable').first().click();assert(!await page.evaluate(()=>AppState.camera.running),'Manual correction must stop live capture');
    await page.evaluate(()=>window.cameraMock.deny=true);await page.click('#startCamera');
    await page.waitForFunction(()=>document.querySelector('#cameraStatus').textContent.includes('permission was denied'));
    assert(await page.locator('#startCamera').isEnabled());await page.evaluate(()=>{window.cameraMock.deny=false;window.cameraMock.delay=true;});await page.click('#startCamera');await page.click('#brandHome');
    await page.evaluate(()=>window.cameraMock.resolvePermission());await page.waitForTimeout(300);
    assert(await page.evaluate(()=>window.cameraMock.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),'Late permission grants must stop their tracks after navigation');
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'Camera and OpenCV must remain offline');
    console.log('camera: ok — real embedded OpenCV, WebRTC MediaStream, all cube grids and skew, Pyraminx, dominant palette clusters, complete validated scan, undo/rescan, no-grid rejection, permission denial/stale grants, track cleanup, mobile and offline');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
