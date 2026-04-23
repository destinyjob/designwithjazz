const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const IMG = path.join(__dirname, '..', 'images');

const jobs = [
  { in: path.join(IMG, 'Jasmine.jpeg'), out: path.join(IMG, 'jasmine.webp'), quality: 82 },
  { in: path.join(IMG, 'Selected visual', 'Linkedin Banners.png'), out: path.join(IMG, 'linkedin-banners.webp'), quality: 85 },
  { in: path.join(IMG, 'Selected visual', 'Carousels.png'), out: path.join(IMG, 'carousels.webp'), quality: 85 },
  { in: path.join(IMG, 'Selected visual', 'Book Covers.png'), out: path.join(IMG, 'book-covers.webp'), quality: 85 },
  { in: path.join(IMG, 'Selected visual', 'Flyers.png'), out: path.join(IMG, 'flyers.webp'), quality: 85 },
];

(async () => {
  for (const j of jobs) {
    if (!fs.existsSync(j.in)) { console.warn('missing', j.in); continue; }
    await sharp(j.in).webp({ quality: j.quality }).toFile(j.out);
    const k = (fs.statSync(j.out).size / 1024).toFixed(1);
    console.log('ok', path.basename(j.out), k + 'KB');
  }
})();
