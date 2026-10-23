/* Local image processing worker. OpenCV.js 4.13.0: Apache-2.0 (embedded license). */
let visionReady=false;
self.onmessage=async({data})=>{
  try {
    if(data.kind==='init') {
      const bytes=Uint8Array.from(atob(data.bundle),c=>c.charCodeAt(0));
      const source=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      try {importScripts(url);} finally {URL.revokeObjectURL(url);}
      await new Promise((resolve,reject)=>{
        const deadline=Date.now()+25000;
        const check=()=>{if(self.cv?.Mat) resolve();else if(Date.now()>deadline) reject(new Error('OpenCV initialization timed out.'));else setTimeout(check,30);};check();
      });
      visionReady=true;self.postMessage({kind:'ready'});return;
    }
    if(data.kind==='frame'&&visionReady) {
      const result=detectFace(new ImageData(new Uint8ClampedArray(data.pixels),data.width,data.height),data.size,data.triangle,data.palette);
      self.postMessage({kind:'result',id:data.id,...result});
    }
  } catch(error) {self.postMessage({kind:'error',id:data.id,message:error.message||String(error)});}
};
function withMats(fn) {
  const allocated=[];const own=mat=>(allocated.push(mat),mat);
  try {return fn(own);} finally {allocated.reverse().forEach(mat=>mat.delete());}
}
function polygonPoints(poly) {
  const points=[];for(let i=0;i<poly.data32S.length;i+=2) points.push([poly.data32S[i],poly.data32S[i+1]]);
  const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;
  points.sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
  const start=points.reduce((best,p,i)=>p[0]+p[1]<points[best][0]+points[best][1]?i:best,0);
  return points.slice(start).concat(points.slice(0,start));
}
function faceCellCenters(size,triangle) {
  if(triangle) return [[.5,2/9],[1/3,5/9],[.5,4/9],[2/3,5/9],[1/6,8/9],[1/3,7/9],[.5,8/9],[2/3,7/9],[5/6,8/9]].map(([x,y])=>[x*240,y*208]);
  return Array.from({length:size*size},(_,i)=>[(i%size+.5)*240/size,(Math.floor(i/size)+.5)*240/size]);
}
function contourCentersMatch(warped,size,triangle,centers) {
  return withMats(own=>{
    const gray=own(new cv.Mat()),edges=own(new cv.Mat()),contours=own(new cv.MatVector()),hierarchy=own(new cv.Mat());
    cv.cvtColor(warped,gray,cv.COLOR_RGBA2GRAY);cv.Canny(gray,edges,25,75);cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
    const found=new Set(),cellArea=(triangle?240*208/2/9:240*240/(size*size)),distance=triangle?17:240/size*.24;
    for(let i=0;i<contours.size();i++) {
      const contour=contours.get(i),poly=new cv.Mat();
      try {
        const area=cv.contourArea(contour);if(area<cellArea*.3||area>cellArea*1.25) continue;
        cv.approxPolyDP(contour,poly,cv.arcLength(contour,true)*.045,true);
        if(poly.rows!==(triangle?3:4)||!cv.isContourConvex(poly)) continue;
        const m=cv.moments(contour);if(!m.m00) continue;
        const x=m.m10/m.m00,y=m.m01/m.m00,index=centers.findIndex(p=>Math.hypot(p[0]-x,p[1]-y)<distance);
        if(index>=0) found.add(index);
      } finally {poly.delete();contour.delete();}
    }
    return found.size===centers.length;
  });
}
function dominantColor(warped,center,radius,palette) {
  return withMats(own=>{
    const pixels=[];
    for(let y=Math.round(center[1]-radius);y<=center[1]+radius;y+=2) for(let x=Math.round(center[0]-radius);x<=center[0]+radius;x+=2) {
      const offset=(y*warped.cols+x)*4,rgb=Array.from(warped.data.slice(offset,offset+3));
      if(Math.max(...rgb)>45) pixels.push(rgb);
    }
    if(pixels.length<12) return null;
    const samples=own(cv.matFromArray(pixels.length,3,cv.CV_32F,pixels.flat())),labels=own(new cv.Mat()),clusters=own(new cv.Mat());
    cv.kmeans(samples,3,labels,new cv.TermCriteria(cv.TermCriteria_EPS+cv.TermCriteria_MAX_ITER,12,.5),2,cv.KMEANS_PP_CENTERS,clusters);
    const counts=[0,0,0];labels.data32S.forEach(label=>counts[label]++);
    const largest=counts.indexOf(Math.max(...counts)),rgb=Array.from(clusters.data32F.slice(largest*3,largest*3+3));
    const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,saturation=max?delta/max:0;
    let hue=delta===0?0:max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(hue<0) hue+=360;
    const color=saturation<.19?'#ffffff':hue<12||hue>=345?'#ff0000':hue<43?'#ffaa00':hue<76?'#ffff00':hue<175?'#00ff00':hue<290?'#0000ff':null;
    if(!color||!palette.includes(color)||max<.28||(saturation>=.19&&saturation<.32)) return null;
    // Reject boundary hues rather than confidently switching red/orange/yellow.
    if(saturation>=.19&&[12,43,76,175,290,345].some(h=>Math.abs(hue-h)<2)) return null;
    const support=counts[largest]/pixels.length;
    return {color,rgb:rgb.map(Math.round),confidence:Math.min(1,support/.65)};
  });
}
function detectFace(image,size,triangle,palette) {
  return withMats(own=>{
    const source=own(cv.matFromImageData(image)),gray=own(new cv.Mat()),blur=own(new cv.Mat()),edges=own(new cv.Mat()),contours=own(new cv.MatVector()),hierarchy=own(new cv.Mat());
    cv.cvtColor(source,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(3,3),0);cv.Canny(blur,edges,25,75);
    cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
    const candidates=[];
    for(let i=0;i<contours.size();i++) {
      const contour=contours.get(i),poly=new cv.Mat();
      try {
        const area=cv.contourArea(contour);if(area<image.width*image.height*.035) continue;
        cv.approxPolyDP(contour,poly,cv.arcLength(contour,true)*.035,true);
        if(poly.rows!==(triangle?3:4)||!cv.isContourConvex(poly)) continue;
        let points=polygonPoints(poly);
        if(triangle) {const top=points.reduce((a,b)=>a[1]<b[1]?a:b);points=[top,...points.filter(p=>p!==top).sort((a,b)=>a[0]-b[0])];}
        candidates.push({area,points});
      } finally {poly.delete();contour.delete();}
    }
    candidates.sort((a,b)=>b.area-a.area);
    for(const candidate of candidates.slice(0,12)) {
      const result=withMats(own=>{
        const points=candidate.points,from=own(cv.matFromArray(points.length,1,cv.CV_32FC2,points.flat())),to=own(cv.matFromArray(points.length,1,cv.CV_32FC2,triangle?[120,0,0,208,240,208]:[0,0,240,0,240,240,0,240]));
        const transform=own(triangle?cv.getAffineTransform(from,to):cv.getPerspectiveTransform(from,to)),warped=own(new cv.Mat());
        if(triangle) cv.warpAffine(source,warped,transform,new cv.Size(240,208));else cv.warpPerspective(source,warped,transform,new cv.Size(240,240));
        const centers=faceCellCenters(size,triangle);
        if(!contourCentersMatch(warped,size,triangle,centers)) return null;
        const samples=centers.map(center=>dominantColor(warped,center,triangle?7:Math.max(5,240/size*.19),palette));
        if(samples.some(s=>!s||s.confidence<.78)) return null;
        return {found:true,points,colors:samples.map(s=>s.color),samples,confidence:Math.min(...samples.map(s=>s.confidence))};
      });
      if(result) return result;
    }
    return {found:false};
  });
}
