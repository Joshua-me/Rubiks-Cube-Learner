// Rebuild the standalone camera payload after editing camera-vision-worker.js.
// Supply the official OpenCV build once; subsequent runs reuse the embedded copy.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'index.html');
const sha256='63366510248adf3a7eddf3e793dd825404efb7df3749f4d6f8557c7fa4ca8aa0';
let html=fs.readFileSync(file,'utf8'),bundle;
if(process.argv[2]) {
  const bytes=fs.readFileSync(process.argv[2]);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==sha256) throw Error('Expected the pinned official OpenCV 4.13.0 build.');
  bundle=zlib.gzipSync(bytes,{level:9}).toString('base64');
} else bundle=html.match(/<script id="opencvBundle"[^>]*>\s*([\s\S]*?)\s*<\/script>/)?.[1];
if(!bundle) throw Error('Provide the downloaded https://docs.opencv.org/4.13.0/opencv.js file.');
const license=fs.readFileSync(path.join(root,'vendor/OPENCV-LICENSE.txt'),'utf8');
const worker=fs.readFileSync(path.join(__dirname,'camera-vision-worker.js'),'utf8');
const block=`<!-- camera-payload:start -->\n<script id="opencvLicense" type="text/plain">\nOpenCV.js 4.13.0 — https://docs.opencv.org/4.13.0/opencv.js\nSHA-256: ${sha256}\n${license}\n</script>\n<script id="opencvBundle" type="application/octet-stream" data-encoding="gzip-base64">\n${bundle.trim()}\n</script>\n<script id="cameraVision" type="text/plain">\n${worker}\n</script>\n<!-- camera-payload:end -->\n`;
if(html.includes('<!-- camera-payload:start -->')) html=html.replace(/<!-- camera-payload:start -->[\s\S]*?<!-- camera-payload:end -->\n?/,block);
else html=html.replace('  <script id="cubejs">',block+'  <script id="cubejs">');
fs.writeFileSync(file,html);console.log('Embedded pinned OpenCV.js and camera worker.');
