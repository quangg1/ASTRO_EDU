import { getStaticAssetUrl, resolveMediaUrl } from '@/lib/apiConfig'
import { getNasaCatalogItemById, type NasaCatalogItem, type ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { ShowcaseEntityContentDTO } from '@/lib/showcaseEntitiesApi'

export type ResolvedNasaCatalogItem = NasaCatalogItem & {
  /** Tên hiển thị (ưu tiên Vi từ CMS). */
  displayName: string
  /** URL ảnh preview sidebar — HTTPS từ DB hoặc CDN static. */
  previewImageUrl: string | null
  museumBlurbVi?: string
}

export type MergedShowcaseOrbitEntity = ShowcaseOrbitEntity & {
  /** Diffuse — ShowcaseEntityMesh ưu tiên hơn texturePath. */
  remoteTextureUrl?: string
  remoteNormalMapUrl?: string
  remoteSpecularMapUrl?: string
  remoteCloudMapUrl?: string
  remoteModelUrl?: string
}

/** True when elements are non-degenerate (JPL ELEMENTS sync / DB). */
export function hasUsableOrbitalElements(
  oe: ShowcaseOrbitEntity['orbitalElements'] | null | undefined,
): boolean {
  if (!oe || typeof oe !== 'object') return false
  const pd = Number(oe.periodDays)
  const a = Number(oe.a)
  return (Number.isFinite(pd) && pd > 0) || (Number.isFinite(a) && a > 0)
}

/** Prefer live JPL payload only when it actually carries elements; avoid `||` hiding DB with zeros. */
export function mergeOrbitalElementsPreferUsable<
  T extends { orbitalElements?: ShowcaseOrbitEntity['orbitalElements'] | null },
>(j: T | undefined, e: ShowcaseOrbitEntity): ShowcaseOrbitEntity['orbitalElements'] | undefined {
  const jj = j?.orbitalElements
  const ee = e.orbitalElements
  if (hasUsableOrbitalElements(jj)) return jj ?? undefined
  if (hasUsableOrbitalElements(ee)) return ee
  return jj ?? ee
}

function effectiveDiffuseUrl(row: ShowcaseEntityContentDTO | undefined, pub: boolean): string {
  if (!row || !pub) return ''
  const d = row.diffuseMapUrl?.trim() || ''
  const legacy = row.textureUrl?.trim() || ''
  const u = d || legacy
  return u && (/^https?:\/\//i.test(u) || u.startsWith('/files/')) ? u : ''
}

function effectiveOptionalUrl(row: ShowcaseEntityContentDTO | undefined, pub: boolean, key: keyof ShowcaseEntityContentDTO): string {
  if (!row || !pub) return ''
  const u = String(row[key] || '').trim()
  return u && (/^https?:\/\//i.test(u) || u.startsWith('/files/')) ? u : ''
}

function contentByEntityId(items: ShowcaseEntityContentDTO[] | undefined): Map<string, ShowcaseEntityContentDTO> {
  const m = new Map<string, ShowcaseEntityContentDTO>()
  for (const it of items || []) {
    const id = String(it.entityId || '').trim()
    if (!id) continue
    m.set(id, it)
  }
  return m
}

export function mergeNasaCatalog(
  base: NasaCatalogItem[],
  items: ShowcaseEntityContentDTO[] | undefined,
): ResolvedNasaCatalogItem[] {
  const m = contentByEntityId(items)
  return base.map((b) => {
    const row = m.get(b.id)
    const pub = !row || row.published !== false
    const nameVi = pub ? row?.nameVi?.trim() || '' : ''
    const museumBlurbVi = pub ? row?.museumBlurbVi?.trim() || '' : ''
    const diffuse = effectiveDiffuseUrl(row, pub)
    const previewImageUrl = diffuse
      ? resolveMediaUrl(diffuse) || null
      : b.texturePath
        ? getStaticAssetUrl(b.texturePath)
        : null
    return {
      ...b,
      displayName: nameVi || b.name,
      previewImageUrl,
      museumBlurbVi: museumBlurbVi || undefined,
    }
  })
}

export function mergeOrbitEntities(
  base: ShowcaseOrbitEntity[],
  items: ShowcaseEntityContentDTO[] | undefined,
): MergedShowcaseOrbitEntity[] {
  const m = contentByEntityId(items)
  return base.map((e) => {
    const row = m.get(e.id)
    if (!row || row.published === false) return { ...e }
    const nameVi = row.nameVi?.trim() || ''
    const diffuse = effectiveDiffuseUrl(row, true)
    const normal = effectiveOptionalUrl(row, true, 'normalMapUrl')
    const spec = effectiveOptionalUrl(row, true, 'specularMapUrl')
    const cloud = effectiveOptionalUrl(row, true, 'cloudMapUrl')
    const model = effectiveOptionalUrl(row, true, 'modelUrl')
    let next: MergedShowcaseOrbitEntity = { ...e }
    if (nameVi) next = { ...next, name: nameVi }
    if (diffuse) next = { ...next, remoteTextureUrl: diffuse }
    if (normal) next = { ...next, remoteNormalMapUrl: normal }
    if (spec) next = { ...next, remoteSpecularMapUrl: spec }
    if (cloud) next = { ...next, remoteCloudMapUrl: cloud }
    if (model) next = { ...next, remoteModelUrl: model }

    const hid = row.horizonsId?.trim()
    if (hid) next = { ...next, horizonsId: hid }
    const oa = row.orbitAround?.trim()
    if (oa) next = { ...next, orbitAround: oa }
    const pid = row.parentId?.trim()
    if (pid) next = { ...next, parentId: pid }
    const ppm = String(row.parentPlanetName || '').trim()
    if (ppm) next = { ...next, parentPlanetName: ppm }
    const rKm = Number(row.radiusKm)
    if (Number.isFinite(rKm) && rKm > 0) next = { ...next, radiusKm: rKm }
    const orbitColor = String(row.orbitColor || '').trim()
    if (/^#[0-9a-fA-F]{6}$/.test(orbitColor)) next = { ...next, orbitColor }
    const hc = row.horizonsCommand?.trim()
    if (hc) next = { ...next, horizonsCommand: hc }
    const hz = row.horizonsCenter?.trim()
    if (hz) next = { ...next, horizonsCenter: hz }
    if (row.orbitalElements && typeof row.orbitalElements === 'object' && hasUsableOrbitalElements(row.orbitalElements)) {
      next = { ...next, orbitalElements: { ...row.orbitalElements } }
    }

    const pidOnly = String(next.parentId || '').trim()
    if (!String(next.parentPlanetName || '').trim() && pidOnly) {
      const cat = getNasaCatalogItemById(pidOnly)
      const inferred = String(cat?.linkedPlanetName || cat?.name || '').trim()
      if (inferred) next = { ...next, parentPlanetName: inferred }
    }

    return next
  })
}

export function getContentRow(
  items: ShowcaseEntityContentDTO[] | undefined,
  entityId: string,
): ShowcaseEntityContentDTO | undefined {
  const id = String(entityId || '').trim()
  if (!id) return undefined
  return contentByEntityId(items).get(id)
}
