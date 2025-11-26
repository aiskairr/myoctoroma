import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Найдем PNG файл в корне (из attachments)
const files = fs.readdirSync(__dirname);
const sourceImage = files.find(f => f.endsWith('.png') && f.includes('image'));

if (!sourceImage) {
  console.log('❌ PNG файл не найден');
  console.log('📥 Сохраните иконку бота как bot-icon.png');
  process.exit(1);
}

console.log('🤖 Используется:', sourceImage);

const publicDir = path.join(__dirname, 'public');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, `pwa-${size}x${size}.png`));
    console.log(`✅ pwa-${size}x${size}.png`);
  }
  
  await sharp(sourceImage).resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');
  
  await sharp(sourceImage).resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✅ favicon.png');
  
  console.log('\n🎉 Готово!');
}

generate();
