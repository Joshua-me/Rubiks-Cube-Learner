const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'index.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'twisty-css-'));
try {
  const html = fs.readFileSync(file, 'utf8').replace(/  <style id="utilities">[\s\S]*?<\/style>\n/, '');
  fs.writeFileSync(path.join(dir, 'content.html'), html);
  const stylesheet = require.resolve('tailwindcss/index.css').replaceAll('\\','/');
  fs.writeFileSync(path.join(dir, 'input.css'), `@import ${JSON.stringify(stylesheet)} source(none);\n@source \"./content.html\";\n`);
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
  execFileSync(process.execPath, [cli,'-i',path.join(dir,'input.css'),'-o',path.join(dir,'output.css'),'--minify'], {stdio:'inherit'});
  const css = fs.readFileSync(path.join(dir,'output.css'),'utf8');
  fs.writeFileSync(file, html.replace('  <style>\n', `  <style id="utilities">${css}</style>\n  <style>\n`));
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
