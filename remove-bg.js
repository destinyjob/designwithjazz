const sharp = require('sharp');
const path = require('path');

const dir = path.join(__dirname, 'images', 'illustrations');

const files = [
  { input: 'Untitled design (22).png', output: 'hand-22.png' },
  { input: 'Untitled design (23).png', output: 'hand-23.png' },
  { input: 'Untitled design (24).png', output: 'hand-24.png' },
  { input: 'Untitled design (25).png', output: 'hand-25.png' },
  { input: 'Untitled design (26).png', output: 'hand-26.png' },
  { input: 'Untitled design (27).png', output: 'hand-27.png' },
];

async function removeBlackBackground(inputPath, outputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 4 (RGBA)
  const pixels = data;

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];

    if (r < 30 && g < 30 && b < 30) {
      pixels[offset + 3] = 0; // set alpha to transparent
    }
  }

  await sharp(Buffer.from(pixels), {
    raw: { width, height, channels },
  })
    .png()
    .toFile(outputPath);

  console.log(`Saved: ${path.basename(outputPath)}`);
}

(async () => {
  for (const { input, output } of files) {
    const inputPath = path.join(dir, input);
    const outputPath = path.join(dir, output);
    try {
      await removeBlackBackground(inputPath, outputPath);
    } catch (err) {
      console.error(`Error processing ${input}:`, err.message);
    }
  }
  console.log('Done.');
})();
