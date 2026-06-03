#!/usr/bin/env node
/**
 * HYG v4 CSV → client/public/sky/data/hip-bright.json (mag ≤ 6.5)
 *
 * Usage (from repo root or client/):
 *   node client/scripts/build-hip-bright.mjs path/to/hygdata_v41.csv
 *   node scripts/build-hip-bright.mjs ../hygdata_v41.csv
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/sky/data/hip-bright.json')
const MAG_LIMIT = 6.5
/** Sao/planet sáng hơn — chỉ billboard explore, không ghi vào point cloud. */
const MAG_FLOOR = -1.5

const defaultCsv = path.join(__dirname, '../public/sky/data/hygdata_v41.csv')
const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultCsv
if (!fs.existsSync(csvPath)) {
  console.error('CSV not found:', csvPath)
  console.error('Usage: node build-hip-bright.mjs [path/to/hygdata_v41.csv]')
  process.exit(1)
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQ = !inQ
      continue
    }
    if (c === ',' && !inQ) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}

const raw = fs.readFileSync(path.resolve(csvPath), 'utf8')
const lines = raw.split(/\r?\n/).filter(Boolean)
const header = parseCsvLine(lines[0])
const idx = (name) => header.indexOf(name)

const raI = idx('ra')
const raRadI = idx('rarad')
const decI = idx('dec')
const magI = idx('mag')
const hipI = idx('hip')
const spectI = idx('spect')
const ciI = idx('ci')
const properI = idx('proper')
const bayerI = idx('bayer')
const flamI = idx('flam')
const bfI = idx('bf')

if (raI < 0 || decI < 0 || magI < 0) {
  console.error('CSV missing ra/dec/mag columns. Header:', header.slice(0, 20).join(', '))
  process.exit(1)
}

const stars = []
for (let li = 1; li < lines.length; li++) {
  const cols = parseCsvLine(lines[li])
  const mag = Number(cols[magI])
  if (!Number.isFinite(mag) || mag > MAG_LIMIT || mag < MAG_FLOOR) continue
  // HYG `ra` = giờ (0–24) → độ; ưu tiên hơn `rarad` (đôi khi lệch tên HYG).
  let raDeg = Number(cols[raI]) * 15
  if (!Number.isFinite(raDeg) && raRadI >= 0 && cols[raRadI] !== '') {
    raDeg = (Number(cols[raRadI]) * 180) / Math.PI
  }
  const decDeg = Number(cols[decI])
  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) continue
  const hip = hipI >= 0 ? Number(cols[hipI]) : undefined
  const proper = properI >= 0 ? String(cols[properI] ?? '').trim() : ''
  const bayer = bayerI >= 0 ? String(cols[bayerI] ?? '').trim() : ''
  const flam = flamI >= 0 ? String(cols[flamI] ?? '').trim() : ''
  const bf = bfI >= 0 ? String(cols[bfI] ?? '').trim() : ''
  const name = proper || bf || (bayer && flam ? `${bayer} ${flam}` : bayer || flam)
  const spect = spectI >= 0 ? String(cols[spectI] ?? '').trim() : undefined
  const bv = ciI >= 0 ? Number(cols[ciI]) : undefined
  stars.push({
    ...(Number.isFinite(hip) && hip > 0 ? { hip } : {}),
    raDeg,
    decDeg,
    mag,
    ...(name ? { name } : {}),
    ...(spect ? { spect } : {}),
    ...(Number.isFinite(bv) ? { bv } : {}),
  })
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(stars))
console.log(`Wrote ${stars.length} stars → ${OUT}`)
