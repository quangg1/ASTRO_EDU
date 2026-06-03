#!/usr/bin/env node
/**
 * western_sky_culture/index.json → westernConstellationBridge.generated.ts
 * Usage: node client/scripts/build-western-bridge.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX = path.join(__dirname, '../public/sky/western_sky_culture/index.json')
const OUT_TS = path.join(__dirname, '../src/features/explore/data/westernConstellationBridge.generated.ts')
const OUT_API = path.join(__dirname, '../../services/api/data/westernConstellationBridge.json')

const ZODIAC = new Set([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpius',
  'sagittarius',
  'capricornus',
  'aquarius',
  'pisces',
])

function westernTargetSlug(nativeName) {
  return nativeName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
const maps = []
const museums = {}
const apiEntities = {}

for (const c of index.constellations) {
  const { english, native } = c.common_name
  const slug = westernTargetSlug(native)
  const entityId = `constellation-western-${slug}`
  const hints = [
    slug,
    'western',
    'constellation',
    c.iau?.toLowerCase(),
    ...english.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    native.toLowerCase(),
  ].filter(Boolean)
  const conceptHints = [...new Set(hints)]
  maps.push({ entityId, conceptHints })
  const zodiac = ZODIAC.has(slug)
  const museumVi =
    `Chòm ${native} (${english}, IAU ${c.iau || '—'}) — bản đồ chòm phương Tây trên La bàn Galaxies; đường nối theo Stellarium (HIP).` +
    (zodiac ? ' Chòm hoàng đạo (zodiac).' : '')
  museums[entityId] = museumVi
  apiEntities[entityId] = {
    nameVi: `Chòm sao ${native}`,
    nameEn: english,
    iauCode: c.iau || null,
    zodiac,
    conceptHints,
    museumVi,
  }
}

const header = `/** Auto-generated — run: npm run sky:build-western-bridge */\n`
const body = `import type { ShowcaseBridgeMap } from '@/features/content3d/showcase/lib/showcaseLearningBridge'

export const WESTERN_CONSTELLATION_BRIDGE_MAP: ShowcaseBridgeMap[] = ${JSON.stringify(maps, null, 2)}

export const WESTERN_CONSTELLATION_MUSEUM_VI: Record<string, string> = ${JSON.stringify(museums, null, 2)}
`

fs.writeFileSync(OUT_TS, header + body)
fs.mkdirSync(path.dirname(OUT_API), { recursive: true })
fs.writeFileSync(
  OUT_API,
  JSON.stringify({ version: 1, count: maps.length, entities: apiEntities }, null, 2),
)
console.log(`Wrote ${maps.length} constellations → ${OUT_TS}`)
console.log(`Wrote API bundle → ${OUT_API}`)
