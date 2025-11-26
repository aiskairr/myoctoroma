import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ищем любое изображение в корне
const publicDir = path.join(__dirname, 'public');

// Пробуем найти изображение
let sourceImage = path.join(__dirname, 'bot-icon.png');
if (!fs.existsSync(sourceImage)) {
  sourceImage = path.join(__dirname, 'photo_2025-11-26 18.16.16.jpeg');
}

if (!fs.existsSync(sourceImage)) {
  console.error('❌ Изображение не найдено');
  console.log('📥 Сохраните иконку бота как bot-icon.png в корне проекта');
  console.log('   Или она будет создана из существующего фото');
  process.exit(1);
}

console.log('🤖 Использую иконку бота:', sourceImage);

const sizes = [
  { size: 72, name: 'pwa-72x72.png' },
  { size: 96, name: 'pwa-96x96.png' },
  { size: 128, name: 'pwa-128x128.png' },
  { size: 144, name: 'pwa-144x144.png' },
  { size: 152, name: 'pwa-152x152.png' },
  { size: 192, name: 'pwa-192x192.png' },
  { size: 384, name: 'pwa-384x384.png' },
  { size: 512, name: 'pwa-512x512.png' }
];

async function generateIcons() {
  try {
    console.log('🎨 Создаю PWA иконки из бота...\n');

    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${name}`);
    }

    // Apple touch icon
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
    console.log('✅ apple-touch-icon.png');

    // Favicon
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    
    console.log('✅ favicon.png');

    console.log('\n🎉 Готово! Теперь запустите: npm run build');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

generateIcons();
