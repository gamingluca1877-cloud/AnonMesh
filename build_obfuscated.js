const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const rootDir = __dirname;

// Read clean source files from /src
const rawIndex = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const rawApp = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');
const rawCss = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');

fs.writeFileSync(path.join(rootDir, 'index.html'), rawIndex, 'utf8');
fs.writeFileSync(path.join(rootDir, 'app.js'), rawApp, 'utf8');
fs.writeFileSync(path.join(rootDir, 'styles.css'), rawCss, 'utf8');

console.log('✅ CLEAN STABLE ROOT FILES GENERATED SUCCESSFULLY!');
