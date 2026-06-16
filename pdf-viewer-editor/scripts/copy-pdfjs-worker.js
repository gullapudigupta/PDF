const fs = require('fs');
const path = require('path');

// Copy PDF.js worker to assets
const source = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js');
const dest = path.join(__dirname, '../src/assets/pdf.worker.min.js');

if (fs.existsSync(source)) {
  fs.copyFileSync(source, dest);
  console.log('PDF.js worker copied to assets');
} else {
  console.warn('PDF.js worker not found. Run npm install first.');
}
