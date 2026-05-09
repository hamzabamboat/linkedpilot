import sharp from 'sharp'
import fs from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

fs.mkdirSync('public/icons', { recursive: true })

for (const size of sizes) {
  await sharp('public/logo-icon.png')
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)
  console.log(`Generated ${size}x${size}`)
}

await sharp('public/logo-icon.png')
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile('public/apple-touch-icon.png')

await sharp('public/logo-icon.png')
  .resize(32, 32)
  .png()
  .toFile('public/favicon-32x32.png')

await sharp('public/logo-icon.png')
  .resize(16, 16)
  .png()
  .toFile('public/favicon-16x16.png')

console.log('All icons generated!')
