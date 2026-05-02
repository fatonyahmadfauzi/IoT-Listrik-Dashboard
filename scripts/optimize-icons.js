/**
 * optimize-icons.js
 * Resize & compress PWA icons from source image + generate tiny favicon
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'assets', 'icons');
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

// Use icon-512.png as source (it's the largest, same 1024x1024 image)
const SOURCE = path.join(ICONS_DIR, 'icon-512.png');

const SIZES = [72, 96, 128, 144, 192, 512];

async function main() {
  console.log('🔧 Starting icon optimization...\n');
  
  // Check source exists
  if (!fs.existsSync(SOURCE)) {
    console.error('Source icon not found:', SOURCE);
    process.exit(1);
  }

  const srcStat = fs.statSync(SOURCE);
  console.log(`Source: ${SOURCE} (${(srcStat.size / 1024).toFixed(1)} KB)\n`);

  // Resize & compress each icon
  for (const size of SIZES) {
    const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 7, g: 12, b: 24, alpha: 1 } })
      .png({ quality: 80, compressionLevel: 9, effort: 10, palette: false })
      .toFile(outPath + '.tmp');

    // Replace original
    fs.renameSync(outPath + '.tmp', outPath);
    const newStat = fs.statSync(outPath);
    console.log(`  ✅ icon-${size}.png → ${(newStat.size / 1024).toFixed(1)} KB`);
  }

  // Generate favicon.ico (actually a 32x32 PNG saved as .ico — browsers handle this fine)
  // For true ICO, we generate a small 32x32 PNG as favicon
  const faviconPngPath = path.join(ASSETS_DIR, 'favicon.png');
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: { r: 7, g: 12, b: 24, alpha: 1 } })
    .png({ quality: 80, compressionLevel: 9, effort: 10 })
    .toFile(faviconPngPath);
  
  const favStat = fs.statSync(faviconPngPath);
  console.log(`  ✅ favicon.png → ${(favStat.size / 1024).toFixed(1)} KB`);

  // Also generate a proper 48x48 favicon.ico (PNG inside ICO container)
  // Since sharp can't write ICO natively, we'll create a 48x48 PNG
  // and overwrite the .ico with it — modern browsers read PNG favicons just fine
  const faviconIcoPath = path.join(ASSETS_DIR, 'favicon.ico');
  
  // Generate ICO-compatible sizes: 16, 32, 48
  const buf16 = await sharp(SOURCE).resize(16, 16).png({ compressionLevel: 9 }).toBuffer();
  const buf32 = await sharp(SOURCE).resize(32, 32).png({ compressionLevel: 9 }).toBuffer();
  const buf48 = await sharp(SOURCE).resize(48, 48).png({ compressionLevel: 9 }).toBuffer();

  // Build ICO file manually (ICO format with PNG payloads)
  const icoBuffer = buildIco([
    { width: 16, height: 16, data: buf16 },
    { width: 32, height: 32, data: buf32 },
    { width: 48, height: 48, data: buf48 },
  ]);
  fs.writeFileSync(faviconIcoPath, icoBuffer);

  const icoStat = fs.statSync(faviconIcoPath);
  console.log(`  ✅ favicon.ico → ${(icoStat.size / 1024).toFixed(1)} KB`);

  console.log('\n✨ Icon optimization complete!');
}

/**
 * Build a proper ICO file from PNG buffers
 */
function buildIco(images) {
  // ICO header: 6 bytes
  // Directory entries: 16 bytes each
  // Image data follows
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let dataOffset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Number of images

  // Directory entries
  const dirs = [];
  const datas = [];
  for (const img of images) {
    const dir = Buffer.alloc(dirEntrySize);
    dir.writeUInt8(img.width >= 256 ? 0 : img.width, 0);   // Width
    dir.writeUInt8(img.height >= 256 ? 0 : img.height, 1);  // Height
    dir.writeUInt8(0, 2);           // Color palette
    dir.writeUInt8(0, 3);           // Reserved
    dir.writeUInt16LE(1, 4);        // Color planes
    dir.writeUInt16LE(32, 6);       // Bits per pixel
    dir.writeUInt32LE(img.data.length, 8);  // Size of image data
    dir.writeUInt32LE(dataOffset, 12);      // Offset to image data
    
    dirs.push(dir);
    datas.push(img.data);
    dataOffset += img.data.length;
  }

  return Buffer.concat([header, ...dirs, ...datas]);
}

main().catch(err => { console.error(err); process.exit(1); });
