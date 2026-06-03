import type { CatalogStar } from '@/features/explore/data/starCatalog'
import type { HipBrightRecord } from '@/features/explore/hooks/useHipBrightCatalog'
import { hipCatalogRaToDeg } from '@/features/explore/lib/hipRa'
import { getSkyHipBrightUrl } from '@/features/explore/lib/skyAssets'
import {
  includeInStarPointCloud,
  magLimitForPollution,
} from '@/features/explore/lib/skyStarStyle'

const CATALOG_MAG_LIMIT = magLimitForPollution('dark')

export type HipCatalogEntry = {
  raDeg: number
  decDeg: number
  mag: number
  name?: string
}

let catalogPromise: Promise<CatalogStar[] | null> | null = null
let catalogSync: CatalogStar[] | null = null
let hipIndexPromise: Promise<Map<number, HipCatalogEntry> | null> | null = null
let hipIndexSync: Map<number, HipCatalogEntry> | null = null

/** Catalog đã fetch — dùng ngay khi build geometry (tránh fallback ~35 sao). */
export function getHipBrightCatalogSync(): CatalogStar[] | null {
  return catalogSync
}

function mapRecords(rows: HipBrightRecord[]): CatalogStar[] {
  return rows
    .filter((s) => includeInStarPointCloud(s.mag, CATALOG_MAG_LIMIT, s.name))
    .map((s, i) => ({
      id: s.hip != null ? `hip-${s.hip}` : `hip-${i}`,
      name: s.name?.trim() ?? '',
      raDeg: hipCatalogRaToDeg(s.raDeg),
      decDeg: s.decDeg,
      mag: s.mag,
      spect: s.spect,
      bv: s.bv,
      label: false,
    }))
}

export function preloadHipBrightCatalog(): void {
  if (catalogPromise) return
  catalogPromise = fetch(getSkyHipBrightUrl())
    .then((r) => (r.ok ? r.json() : null))
    .then((data: HipBrightRecord[] | { stars: HipBrightRecord[] } | null) => {
      if (!data) return null
      const rows = Array.isArray(data) ? data : data.stars
      if (!rows?.length) return null
      const mapped = mapRecords(rows)
      catalogSync = mapped
      return mapped
    })
    .catch(() => null)
}

export function fetchHipBrightCatalog(): Promise<CatalogStar[] | null> {
  if (!catalogPromise) preloadHipBrightCatalog()
  return catalogPromise!
}

function buildHipIndex(rows: HipBrightRecord[]): Map<number, HipCatalogEntry> {
  const map = new Map<number, HipCatalogEntry>()
  for (const s of rows) {
    if (s.hip == null) continue
    map.set(s.hip, {
      raDeg: hipCatalogRaToDeg(s.raDeg),
      decDeg: s.decDeg,
      mag: s.mag,
      name: s.name?.trim() || undefined,
    })
  }
  return map
}

export function getHipCatalogIndexSync(): Map<number, HipCatalogEntry> | null {
  return hipIndexSync
}

export function preloadHipCatalogIndex(): void {
  if (hipIndexPromise) return
  hipIndexPromise = fetch(getSkyHipBrightUrl())
    .then((r) => (r.ok ? r.json() : null))
    .then((data: HipBrightRecord[] | { stars: HipBrightRecord[] } | null) => {
      if (!data) return null
      const rows = Array.isArray(data) ? data : data.stars
      if (!rows?.length) return null
      const map = buildHipIndex(rows)
      hipIndexSync = map
      return map
    })
    .catch(() => null)
}

export function fetchHipCatalogIndex(): Promise<Map<number, HipCatalogEntry> | null> {
  if (!hipIndexPromise) preloadHipCatalogIndex()
  return hipIndexPromise!
}
