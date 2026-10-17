const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const target = process.argv[2] || 'chrome';
const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'extension');
const distDir = path.join(extensionDir, 'dist', target);

if (!['chrome', 'firefox'].includes(target)) {
  throw new Error(`Unsupported extension target: ${target}`);
}

const manifestFile = target === 'firefox' ? 'manifest.firefox.json' : 'manifest.chrome.json';
const appDistDir = path.join(root, 'dist', 'extension-app');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of [manifestFile, 'background.js', 'popup.html', 'popup.js']) {
  const source = path.join(extensionDir, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Required extension file is missing: ${source}`);
  }

  const destination = path.join(distDir, file === manifestFile ? 'manifest.json' : file);
  fs.copyFileSync(source, destination);
}

const iconDir = path.join(extensionDir, 'icons');
for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
  const source = path.join(iconDir, icon);
  if (!fs.existsSync(source)) {
    throw new Error(`Required extension icon is missing: ${source}`);
  }

  const destinationDir = path.join(distDir, 'icons');
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(source, path.join(destinationDir, icon));
}

const appSourceDir = [appDistDir, path.join(appDistDir, 'browser')].find(directory =>
  fs.existsSync(path.join(directory, 'index.html'))
);
if (!appSourceDir) {
  throw new Error(`Extension viewer build is missing. Expected index.html under ${appDistDir}`);
}

fs.cpSync(appSourceDir, path.join(distDir, 'viewer'), { recursive: true, force: true });

const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, manifestFile), 'utf8'));
const archiveExtension = target === 'firefox' ? 'xpi' : 'zip';
const archivePath = path.join(
  extensionDir,
  'dist',
  `pdf-viewer-editor-${target}-${manifest.version}.${archiveExtension}`
);

function createArchive() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

createArchive()
  .then(() => {
    console.log(`Extension build output: ${distDir}`);
    console.log(`Upload package: ${archivePath}`);
  })
  .catch(error => {
    console.error(
      `Unable to package extension artifact: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
