import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
const { default: pngToIco } = await import('png-to-ico');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'icons', 'icon-512.png');
const buildDir = path.join(__dirname, '..', 'build');
const outputIco = path.join(buildDir, 'icon.ico');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const iconSizes = [16, 24, 32, 48, 64, 128, 256];
const pngBuffers = await Promise.all(
  iconSizes.map((size) =>
    sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  )
);

const icoBuffer = await pngToIco(pngBuffers);
fs.writeFileSync(outputIco, icoBuffer);

console.log('Created:', outputIco);
