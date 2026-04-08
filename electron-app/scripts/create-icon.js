const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function createIcon() {
  const source = path.join(__dirname, '..', 'public', 'icons', 'icon-512.png');
  const buildDir = path.join(__dirname, '..', 'build');
  const tempPng = path.join(buildDir, 'icon-temp.png');
  const outputIco = path.join(buildDir, 'icon.ico');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const image = await Jimp.read(source);
  await image.resize(256, 256).writeAsync(tempPng);

  const icoBuffer = await pngToIco(tempPng);
  fs.writeFileSync(outputIco, icoBuffer);

  fs.unlinkSync(tempPng);
  console.log('Created:', outputIco);
}

createIcon().catch((error) => {
  console.error(error);
  process.exit(1);
});
