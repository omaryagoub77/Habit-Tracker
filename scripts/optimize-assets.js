/**
 * Script to optimize assets for the Habit Tracker Pro app
 * This script helps reduce bundle size by optimizing images
 */
const fs = require('fs');
const path = require('path');

// Define paths to asset optimization tools
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');
const ORIGINAL_SIZE_FILE = path.join(__dirname, 'original-sizes.json');

function log(...args) {
  console.log('[Asset Optimizer]', ...args);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getAssetSizes() {
  const assets = {};
  const files = fs.readdirSync(ASSETS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      const filePath = path.join(ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      assets[file] = stats.size;
    }
  }
  
  return assets;
}

function saveOriginalSizes() {
  const sizes = getAssetSizes();
  fs.writeFileSync(ORIGINAL_SIZE_FILE, JSON.stringify(sizes, null, 2));
  log('Saved original asset sizes to', ORIGINAL_SIZE_FILE);
}

function loadOriginalSizes() {
  if (!fs.existsSync(ORIGINAL_SIZE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(ORIGINAL_SIZE_FILE, 'utf8'));
  } catch (e) {
    log('Error reading original sizes file:', e.message);
    return null;
  }
}

function calculateSavings() {
  const currentSizes = getAssetSizes();
  const originalSizes = loadOriginalSizes();
  
  if (!originalSizes) {
    log('No original sizes found. Run optimization first.');
    return;
  }
  
  let totalOriginal = 0;
  let totalCurrent = 0;
  
  for (const [file, currentSize] of Object.entries(currentSizes)) {
    const originalSize = originalSizes[file] || currentSize;
    totalOriginal += originalSize;
    totalCurrent += currentSize;
    
    const savings = originalSize - currentSize;
    const percent = originalSize > 0 ? (savings / originalSize * 100) : 0;
    
    log(`${file}: ${formatBytes(originalSize)} → ${formatBytes(currentSize)} (${percent.toFixed(1)}% ${savings >= 0 ? 'saved' : 'increased'})`);
  }
  
  const totalSavings = totalOriginal - totalCurrent;
  const totalPercent = totalOriginal > 0 ? (totalSavings / totalOriginal * 100) : 0;
  
  log(`\nTotal: ${formatBytes(totalOriginal)} → ${formatBytes(totalCurrent)} (${totalPercent.toFixed(1)}% ${totalSavings >= 0 ? 'saved' : 'increased'})`);
}

function main() {
  const action = process.argv[2] || 'stats';
  
  switch (action) {
    case 'save-original':
      saveOriginalSizes();
      break;
    case 'stats':
      calculateSavings();
      break;
    default:
      log('Usage: node optimize-assets.js [save-original|stats]');
      log('  save-original: Save current asset sizes as baseline');
      log('  stats: Show size comparison between current and original assets');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getAssetSizes,
  saveOriginalSizes,
  loadOriginalSizes,
  calculateSavings
};