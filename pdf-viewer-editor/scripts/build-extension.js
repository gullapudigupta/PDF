const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'chrome';
const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'extension');
const distDir = path.join(extensionDir, 'dist', target);

if (!['chrome', 'firefox'].includes(target)) {
  throw new Error(`Unsupported extension target: ${target}`);
}

const manifestFile =
  target === 'firefox' ? 'manifest.firefox.json' : 'manifest.chrome.json';
const appDistDir = path.join(root, 'dist', 'extension-app');

fs.mkdirSync(distDir, { recursive: true });

for (const file of [
  manifestFile,
  'background.js',
  'popup.html',
  'popup.js',
]) {
  const source = path.join(extensionDir, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Required extension file is missing: ${source}`);
  }

  const destination = path.join(distDir, file === manifestFile ? 'manifest.json' : file);
  fs.copyFileSync(source, destination);
}

const appSourceDir = [appDistDir, path.join(appDistDir, 'browser')]
  .find(directory => fs.existsSync(path.join(directory, 'index.html')));
if (!appSourceDir) {
  throw new Error(`Extension viewer build is missing. Expected index.html under ${appDistDir}`);
}

fs.cpSync(appSourceDir, path.join(distDir, 'viewer'), { recursive: true, force: true });

console.log(`Extension build output: ${distDir}`);
