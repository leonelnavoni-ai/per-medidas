import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const logoSvgPath = path.resolve('public/logo-policia-entre-rios.svg');
const logoSvgContent = fs.readFileSync(logoSvgPath, 'utf8');

// Strip the outer <svg> wrapper to embed inside a master icon SVG
const innerSvgMatch = logoSvgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
const innerSvg = innerSvgMatch ? innerSvgMatch[1] : '';

// 1. Master Icon SVG (512x512) with elegant dark police background
const masterIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="iconBgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#070b14" />
    </radialGradient>
  </defs>
  <!-- Dark background canvas -->
  <rect width="512" height="512" rx="104" fill="url(#iconBgGlow)" />
  <!-- Border subtle highlight -->
  <rect width="508" height="508" x="2" y="2" rx="102" fill="none" stroke="#334155" stroke-width="2" opacity="0.6" />
  <!-- Embedded Police Emblem scaled to fit nicely -->
  <g transform="translate(16, 16) scale(0.96)">
    <svg viewBox="0 0 500 500" width="500" height="500">
      ${innerSvg}
    </svg>
  </g>
</svg>`;

// 2. Maskable Icon SVG (512x512) - Android requires 15-20% safe zone padding around edge
const maskableIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="maskBgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#070b14" />
    </radialGradient>
  </defs>
  <!-- Full bleed background with no rounded corners (Android handles shape) -->
  <rect width="512" height="512" fill="url(#maskBgGlow)" />
  <!-- Centered Emblem scaled to 78% so rays never get clipped by squircle/circle masks -->
  <g transform="translate(61.4, 61.4) scale(0.76)">
    <svg viewBox="0 0 500 500" width="500" height="500">
      ${innerSvg}
    </svg>
  </g>
</svg>`;

async function run() {
  console.log('Writing public/icon.svg...');
  fs.writeFileSync(path.resolve('public/icon.svg'), masterIconSvg, 'utf8');

  console.log('Generating PNG icons with sharp...');
  
  // 192x192
  await sharp(Buffer.from(masterIconSvg))
    .resize(192, 192)
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('✓ pwa-192x192.png generated');

  // 512x512
  await sharp(Buffer.from(masterIconSvg))
    .resize(512, 512)
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('✓ pwa-512x512.png generated');

  // 180x180 apple-touch-icon (iOS Safari)
  await sharp(Buffer.from(masterIconSvg))
    .resize(180, 180)
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generated');

  // 512x512 maskable for Android
  await sharp(Buffer.from(maskableIconSvg))
    .resize(512, 512)
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('✓ pwa-maskable-512x512.png generated');

  // Favicon 64x64
  await sharp(Buffer.from(masterIconSvg))
    .resize(64, 64)
    .png({ quality: 95 })
    .toFile(path.resolve('public/favicon.png'));
  console.log('✓ favicon.png generated');

  console.log('All icons generated successfully!');
}

run().catch(console.error);
