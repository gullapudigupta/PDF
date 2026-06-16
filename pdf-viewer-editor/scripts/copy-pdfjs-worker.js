const fs = require('fs');
const path = require('path');

const candidates = [
  {
    source: path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    dest: path.join(__dirname, '../src/assets/pdf.worker.min.mjs'),
  },
  {
    source: path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js'),
    dest: path.join(__dirname, '../src/assets/pdf.worker.min.js'),
  },
];

let copied = false;

for (const candidate of candidates) {
  if (fs.existsSync(candidate.source)) {
    fs.copyFileSync(candidate.source, candidate.dest);
    copied = true;
  }
}

if (copied) {
  console.log('PDF.js worker copied to assets');
} else {
  console.warn('PDF.js worker not found. Run npm install first.');
}
