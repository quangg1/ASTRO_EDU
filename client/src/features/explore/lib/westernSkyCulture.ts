import type { SkyExploreTarget, SkyStarNode } from './exploreTargets'
import { raDecToUnitVector } from './exploreTargets'
import type { HipCatalogEntry } from './hipBrightCatalogCache'

import { getSkyWesternIllustrationUrl, getSkyWesternIndexUrl } from './skyAssets'

const ZODIAC_SLUGS = new Set([
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

export type WesternCommonName = {
  english: string
  native: string
}

export type WesternCultureConstellation = {
  id: string
  lines: number[][]
  image?: {
    file: string
    size?: [number, number]
    anchors?: Array<{ pos: [number, number]; hip: number }>
  }
  common_name: WesternCommonName
  iau?: string
}

export type WesternSkyCultureIndex = {
  id: string
  region?: string
  constellations: WesternCultureConstellation[]
}

let culturePromise: Promise<WesternSkyCultureIndex | null> | null = null

/** Slug from IAU Latin name, e.g. Orion → `orion`. */
export function westernTargetSlug(nativeName: string): string {
  return nativeName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function westernExploreTargetId(nativeName: string): string {
  return `constellation-western-${westernTargetSlug(nativeName)}`
}

/** Stellarium paths use `illustrations/`; webp assets live at culture root (CDN `/sky/…`). */
export function resolveWesternImageUrl(file: string | undefined): string | undefined {
  return getSkyWesternIllustrationUrl(file)
}

export function fetchWesternSkyCulture(): Promise<WesternSkyCultureIndex | null> {
  if (!culturePromise) {
    culturePromise = fetch(getSkyWesternIndexUrl())
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return culturePromise
}

function centroidRaDec(nodes: Array<{ raDeg: number; decDeg: number }>): {
  raDeg: number
  decDeg: number
} {
  if (!nodes.length) return { raDeg: 0, decDeg: 0 }
  let x = 0
  let y = 0
  let z = 0
  for (const n of nodes) {
    const v = raDecToUnitVector(n.raDeg, n.decDeg)
    x += v[0]
    y += v[1]
    z += v[2]
  }
  const len = Math.hypot(x, y, z)
  if (len < 1e-9) return { raDeg: nodes[0].raDeg, decDeg: nodes[0].decDeg }
  x /= len
  y /= len
  z /= len
  const decDeg = (Math.asin(Math.min(1, Math.max(-1, y))) * 180) / Math.PI
  let raDeg = (Math.atan2(z, x) * 180) / Math.PI
  if (raDeg < 0) raDeg += 360
  return { raDeg, decDeg }
}

function starNodeFromHip(hip: number, entry: HipCatalogEntry): SkyStarNode {
  return {
    id: `hip-${hip}`,
    raDeg: entry.raDeg,
    decDeg: entry.decDeg,
    mag: entry.mag,
  }
}

export function buildWesternExploreTargets(
  culture: WesternSkyCultureIndex,
  hipByNumber: Map<number, HipCatalogEntry>,
): SkyExploreTarget[] {
  const out: SkyExploreTarget[] = []

  for (const c of culture.constellations) {
    const { english, native } = c.common_name
    const slug = westernTargetSlug(native)
    const hipSet = new Set<number>()
    for (const chain of c.lines) {
      for (const hip of chain) hipSet.add(hip)
    }

    const starNodes: SkyStarNode[] = []
    for (const hip of hipSet) {
      const entry = hipByNumber.get(hip)
      if (!entry) continue
      starNodes.push(starNodeFromHip(hip, entry))
    }
    if (!starNodes.length) continue

    const byNodeId = new Map(starNodes.map((n) => [n.id, n]))
    const edges: [string, string][] = []
    for (const chain of c.lines) {
      for (let i = 0; i < chain.length - 1; i++) {
        const a = `hip-${chain[i]}`
        const b = `hip-${chain[i + 1]}`
        if (byNodeId.has(a) && byNodeId.has(b)) edges.push([a, b])
      }
    }
    if (!edges.length) continue

    const center = centroidRaDec(starNodes)
    const hints = [
      slug,
      'western',
      'constellation',
      c.iau?.toLowerCase(),
      ...english.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
      native.toLowerCase(),
    ].filter((h): h is string => Boolean(h))

    out.push({
      id: westernExploreTargetId(native),
      kind: 'constellation',
      nameVi: `Chòm sao ${native}`,
      nameEn: english,
      zodiac: ZODIAC_SLUGS.has(slug),
      conceptHints: [...new Set(hints)],
      raDeg: center.raDeg,
      decDeg: center.decDeg,
      starNodes,
      edges,
      illustrationUrl: resolveWesternImageUrl(c.image?.file),
      iauCode: c.iau,
    })
  }

  out.sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'))
  return out
}

export async function loadWesternExploreTargets(
  hipByNumber: Map<number, HipCatalogEntry>,
): Promise<SkyExploreTarget[]> {
  const culture = await fetchWesternSkyCulture()
  if (!culture?.constellations?.length) return []
  return buildWesternExploreTargets(culture, hipByNumber)
}

export const DEFAULT_WESTERN_SKY_TARGET_ID = westernExploreTargetId('Orion')

/** Map legacy explore target ids (pre-skyculture or Balinese) to Western ids. */
export const LEGACY_CONSTELLATION_TARGET_MAP: Record<string, string> = {
  'constellation-orion': DEFAULT_WESTERN_SKY_TARGET_ID,
  'constellation-leo': westernExploreTargetId('Leo'),
  'constellation-ursa-major': westernExploreTargetId('Ursa Major'),
  'constellation-scorpius': westernExploreTargetId('Scorpius'),
}

export function resolveWesternConstellationTargetId(raw: string): string | null {
  const t = String(raw || '').trim()
  if (!t.startsWith('constellation-')) return null
  if (t.startsWith('constellation-western-')) return t
  return LEGACY_CONSTELLATION_TARGET_MAP[t] ?? DEFAULT_WESTERN_SKY_TARGET_ID
}
