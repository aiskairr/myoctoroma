import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = path.join(__dirname, 'photo_2025-11-26 18.16.16.jpeg');
const publicDir = path.join(__dirname, 'public');

// Проверяем существование исходного файла
if (!fs.existsSync(sourceImage)) {
  console.error('❌ Исходное изображение не найдено:', sourceImage);
  process.exit(1);
}

console.log('📸 Исходное изображение найдено:', sourceImage);

// Создаем иконки разных размеров
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
    console.log('🎨 Начинаем генерацию иконок...\n');

    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Создана: ${name} (${size}x${size})`);
    }

    // Создаем также apple-touch-icon
    const appleTouchIcon = path.join(publicDir, 'apple-touch-icon.png');
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(appleTouchIcon);
    
    console.log('✅ Создана: apple-touch-icon.png (180x180)');

    // Создаем favicon
    const favicon = path.join(publicDir, 'favicon.png');
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(favicon);
    
    console.log('✅ Создана: favicon.png (32x32)');

    console.log('\n🎉 Все иконки успешно созданы!');
    console.log('📁 Расположение: /public/');
    console.log('\n📝 Следующие шаги:');
    console.log('1. Проверьте иконки в папке /public/');
    console.log('2. Запустите: npm run build');
    console.log('3. Задеплойте приложение');

  } catch (error) {
    console.error('❌ Ошибка при генерации иконок:', error);
    process.exit(1);
  }
}

generateIcons();
