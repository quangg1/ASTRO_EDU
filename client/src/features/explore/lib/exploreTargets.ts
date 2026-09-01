import type { ShowcasePanelConfigDTO } from '@/features/content3d/showcase/public'

/** Explore hub: solar 3D entities vs sky dome targets share `entityId` where possible. */

export type ExploreView = 'solar' | 'sky'

export type ExploreTargetKind = 'body' | 'constellation' | 'star'

export type SkyStarNode = {
  id: string
  raDeg: number
  decDeg: number
  mag: number
}

export type SkyExploreTarget = {
  id: string
  kind: ExploreTargetKind
  nameVi: string
  nameEn?: string
  zodiac?: boolean
  conceptHints?: string[]
  raDeg: number
  decDeg: number
  mag?: number
  solarEntityId?: string
  starNodes?: SkyStarNode[]
  edges?: [string, string][]
  /** Stellarium western skyculture illustration (`/sky/western_sky_culture/*.webp`). */
  illustrationUrl?: string
  iauCode?: string
  /** CMS copy — panel học tập la bàn chòm sao (Studio → Sky Targets). */
  museumBlurbVi?: string
  panelConfig?: ShowcasePanelConfigDTO
}

export function parseExploreView(raw: string | null | undefined): ExploreView {
  const v = String(raw || '').trim().toLowerCase()
  return v === 'sky' || v === 'compass' ? 'sky' : 'solar'
}

export function isConstellationTargetId(id: string): boolean {
  return String(id || '').trim().startsWith('constellation-')
}

export function isSkyOnlyTarget(id: string): boolean {
  return isConstellationTargetId(id) || String(id || '').trim().startsWith('star-hip-')
}

export function resolveSolarEntityIdForTarget(target: SkyExploreTarget | null): string | null {
  if (!target) return null
  if (target.kind === 'body') {
    return String(target.solarEntityId || target.id || '').trim() || null
  }
  return null
}

export function getSkyTargetLabel(target: SkyExploreTarget | null, fallbackId = ''): string {
  if (!target) return fallbackId || 'Mục tiêu'
  return target.nameVi || target.nameEn || target.id
}

/** Equatorial RA/Dec (deg) → unit direction (Y up = north celestial pole). */
export function raDecToUnitVector(raDeg: number, decDeg: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  const cosDec = Math.cos(dec)
  return [cosDec * Math.cos(ra), Math.sin(dec), cosDec * Math.sin(ra)]
}
