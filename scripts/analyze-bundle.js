import { readFileSync, existsSync } from 'fs';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function analyzeFile(filename) {
  const filepath = join(distDir, filename);

  if (!existsSync(filepath)) {
    console.log(`❌ ${filename} - File not found`);
    return null;
  }

  const content = readFileSync(filepath);
  const gzipped = gzipSync(content);

  return {
    filename,
    size: content.length,
    gzipSize: gzipped.length,
    sizeFormatted: formatBytes(content.length),
    gzipFormatted: formatBytes(gzipped.length),
  };
}

console.log('\n📊 Bundle Size Analysis\n');
console.log('='.repeat(60));

const files = ['index.js', 'index.min.js', 'index.esm.js', 'index.cjs'];

const results = files.map(analyzeFile).filter(Boolean);

results.forEach((result) => {
  console.log(
    `📦 ${result.filename.padEnd(15)} ${result.sizeFormatted.padStart(8)} (${result.gzipFormatted} gzipped)`
  );
});

console.log('='.repeat(60));

// Calculate total sizes
const totalSize = results.reduce((sum, r) => sum + r.size, 0);
const totalGzip = results.reduce((sum, r) => sum + r.gzipSize, 0);

console.log(`📊 Total: ${formatBytes(totalSize)} (${formatBytes(totalGzip)} gzipped)\n`);

// Size warnings
const minified = results.find((r) => r.filename === 'index.min.js');
if (minified) {
  if (minified.gzipSize > 50 * 1024) {
    console.log('⚠️  Warning: Minified bundle is larger than 50KB gzipped');
  } else if (minified.gzipSize > 25 * 1024) {
    console.log('📝 Note: Minified bundle is larger than 25KB gzipped');
  } else {
    console.log('✅ Bundle size looks good!');
  }
}
