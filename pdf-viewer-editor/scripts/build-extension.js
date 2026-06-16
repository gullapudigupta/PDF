const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'chrome';
const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'extension');
const distDir = path.join(extensionDir, 'dist', target);

const manifestFile =
  target === 'firefox' ? 'manifest.firefox.json' : 'manifest.chrome.json';

fs.mkdirSync(distDir, { recursive: true });

const filesToCopy = [
  manifestFile,
  'background.js',
  'popup.html',
  'popup.js',
];

for (const file of filesToCopy) {
  const source = path.join(extensionDir, file);
  const destination = path.join(distDir, file === manifestFile ? 'manifest.json' : file);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
  }
}

console.log(`Extension build output: ${distDir}`);
