import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

const raw = '/Users/hamza/linkedpilot/public/logo-raw.png'

// logo.png — 512x512 full logo with wordmark
await sharp(raw)
  .resize(512, 512, { fit: 'contain', background: { r: 242, g: 242, b: 242, alpha: 1 } })
  .png()
  .toFile('/Users/hamza/linkedpilot/public/logo.png')
console.log('✓ logo.png')

// logo-icon.png — 192x192, crop top ~58% to get just the P+L mark (no wordmark)
await sharp(raw)
  .extract({ left: 0, top: 0, width: 1500, height: 870 })
  .resize(192, 192, { fit: 'contain', background: { r: 242, g: 242, b: 242, alpha: 1 } })
  .png()
  .toFile('/Users/hamza/linkedpilot/public/logo-icon.png')
console.log('✓ logo-icon.png')

// logo-dark.png — 512x512 on dark background (#0f172a)
await sharp(raw)
  .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
  .png()
  .toFile('/Users/hamza/linkedpilot/public/logo-dark.png')
console.log('✓ logo-dark.png')

// favicon.ico — 32x32 PNG saved as .ico (works in all modern browsers)
await sharp(raw)
  .extract({ left: 0, top: 0, width: 1500, height: 870 })
  .resize(32, 32, { fit: 'contain', background: { r: 242, g: 242, b: 242, alpha: 1 } })
  .png()
  .toFile('/Users/hamza/linkedpilot/public/favicon.ico')
console.log('✓ favicon.ico')

// apple-touch-icon.png — 180x180 icon mark on white
await sharp(raw)
  .extract({ left: 0, top: 0, width: 1500, height: 870 })
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile('/Users/hamza/linkedpilot/public/apple-touch-icon.png')
console.log('✓ apple-touch-icon.png')

console.log('\nAll logo files generated.')
