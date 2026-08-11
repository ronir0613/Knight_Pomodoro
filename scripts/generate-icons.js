import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');

async function generate() {
  const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));
  const simplifiedSvg = fs.readFileSync(path.join(publicDir, 'icon-simplified.svg'));

  await sharp(simplifiedSvg).resize(16, 16).png().toFile(path.join(publicDir, 'icon-16.png'));
  await sharp(iconSvg).resize(32, 32).png().toFile(path.join(publicDir, 'icon-32.png'));
  await sharp(iconSvg).resize(48, 48).png().toFile(path.join(publicDir, 'icon-48.png'));
  await sharp(iconSvg).resize(128, 128).png().toFile(path.join(publicDir, 'icon-128.png'));
  
  console.log('Icons generated successfully.');
}

generate().catch(console.error);
