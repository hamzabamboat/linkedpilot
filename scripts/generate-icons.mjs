import sharp from 'sharp'
import fs from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

fs.mkdirSync('public/icons', { recursive: true })

// Generate icon: logo centered on a white circle, transparent corners
async function generateCircleIcon(inputPath, size, outputPath) {
  const radius = size / 2
  const logoPadding = 0.2 // 20% padding around logo
  const logoSize = Math.round(size * (1 - logoPadding * 2))

  // White filled circle, transparent outside
  const circleSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
    </svg>`
  )

  // Logo resized to fit inside the circle with padding
  const logo = await sharp(inputPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()

  // Transparent canvas → white circle → logo centered
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: circleSvg, gravity: 'center' },
      { input: logo, gravity: 'center' },
    ])
    .png()
    .toFile(outputPath)
}

for (const size of sizes) {
  await generateCircleIcon('public/logo-icon.png', size, `public/icons/icon-${size}x${size}.png`)
  console.log(`Generated icon-${size}x${size}.png`)
}

// Apple touch icon (180x180)
await generateCircleIcon('public/logo-icon.png', 180, 'public/apple-touch-icon.png')
console.log('Generated apple-touch-icon.png')

// Browser favicons
await generateCircleIcon('public/logo-icon.png', 32, 'public/favicon-32x32.png')
await generateCircleIcon('public/logo-icon.png', 32, 'public/favicon.ico')
await generateCircleIcon('public/logo-icon.png', 16, 'public/favicon-16x16.png')
console.log('Generated favicons')

console.log('All icons generated with white circle background!')
