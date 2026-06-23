/* Generates the favicon set and social banner from code, in the WHO RUGGED?
   arcade identity. The big title is drawn from a 5x7 bitmap font (pure rects,
   no font dependency, authentically pixel); small text uses a system mono via
   resvg. Re-run with: node scripts/gen-images.mjs */
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
mkdirSync(pub, { recursive: true })

const C = {
  void: '#0C1626',
  void2: '#10213B',
  panel: '#16294A',
  cream: '#F5ECD6',
  sky: '#5BB0E8',
  gold: '#F4B740',
  alarm: '#FF5277',
  lime: '#A7E05A',
  ink: '#07101F',
  dim: '#8FA6C4',
}

// 5x7 bitmap glyphs for the title
const FONT = {
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
}

const wordWidth = (word, cell) => word.length * 5 * cell + (word.length - 1) * cell

function drawWord(word, x, y, cell, color, dx = 0, dy = 0) {
  let out = ''
  let cx = x + dx
  for (const ch of word) {
    const g = FONT[ch]
    if (g) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r][c] === '1') {
            out += `<rect x="${cx + c * cell}" y="${y + dy + r * cell}" width="${cell}" height="${cell}" fill="${color}"/>`
          }
        }
      }
    }
    cx += 6 * cell // 5 wide + 1 gap
  }
  return out
}

function titleBlock(word, cy, cell, w) {
  const ww = wordWidth(word, cell)
  const x = (w - ww) / 2
  const sh = Math.round(cell * 0.9)
  return (
    drawWord(word, x, cy, cell, C.sky, sh * 2, sh * 2) +
    drawWord(word, x, cy, cell, C.alarm, sh, sh) +
    drawWord(word, x, cy, cell, C.cream, 0, 0)
  )
}

function scanlines(w, h) {
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#scan)"/>`
}

function ogBanner() {
  const w = 1200
  const h = 630
  const cell = 17
  const swatch = ['#5BB0E8', '#F4B740', '#FF5277', '#A7E05A']
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="-10%" r="120%">
      <stop offset="0%" stop-color="${C.panel}"/>
      <stop offset="60%" stop-color="${C.void}"/>
    </radialGradient>
    <pattern id="scan" width="1" height="3" patternUnits="userSpaceOnUse">
      <rect width="1" height="3" fill="rgba(0,0,0,0)"/>
      <rect width="1" height="1" y="2" fill="rgba(0,0,0,0.18)"/>
    </pattern>
    <radialGradient id="vig" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${scanlines(w, h)}
  <rect width="${w}" height="${h}" fill="url(#vig)"/>
  <rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="${C.sky}" stroke-width="6"/>

  <text x="${w / 2}" y="96" text-anchor="middle" font-family="monospace" font-size="22" letter-spacing="6" fill="${C.gold}">0G ZERO CUP // ENTRY No.001</text>

  ${titleBlock('WHO', 140, cell, w)}
  ${titleBlock('RUGGED?', 300, cell, w)}

  <text x="${w / 2}" y="512" text-anchor="middle" font-family="monospace" font-size="26" fill="${C.cream}">Five suspects. One drained the vault. You are the cop.</text>
  <text x="${w / 2}" y="556" text-anchor="middle" font-family="monospace" font-size="19" letter-spacing="3" fill="${C.dim}">A DEDUCTION GAME ON 0G THAT CAN PROVE IT NEVER CHEATED</text>

  ${swatch.map((c, i) => `<rect x="${w / 2 - 2 * 34 + i * 34}" y="582" width="26" height="14" fill="${c}" stroke="${C.ink}" stroke-width="2"/>`).join('')}
</svg>`
}

function faviconSvg(size = 64) {
  const cell = Math.floor(size / 9) // glyph 5 wide, leave margin
  const gw = 5 * cell
  const x = Math.round((size - gw) / 2)
  const y = Math.round((size - 7 * cell) / 2)
  const sh = Math.max(1, Math.round(cell * 0.18))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${C.void}"/>
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="${C.sky}" stroke-width="${Math.max(1, Math.round(size / 32))}"/>
  ${drawWord('?', x, y, cell, C.alarm, sh, sh)}
  ${drawWord('?', x, y, cell, C.gold, 0, 0)}
</svg>`
}

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } })
    .render()
    .asPng()
}

// favicon: crisp SVG + PNG fallbacks + apple touch
const favSvg = faviconSvg(64)
writeFileSync(join(pub, 'favicon.svg'), favSvg)
writeFileSync(join(pub, 'favicon.png'), png(favSvg, 32))
writeFileSync(join(pub, 'apple-touch-icon.png'), png(faviconSvg(180), 180))

// social banner (Open Graph / Twitter) 1200x630
const og = ogBanner()
writeFileSync(join(pub, 'og.svg'), og)
writeFileSync(join(pub, 'og.png'), png(og, 1200))

console.log('wrote favicon.svg, favicon.png, apple-touch-icon.png, og.svg, og.png to public/')
