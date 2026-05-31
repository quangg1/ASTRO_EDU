import type { ResolvedNasaCatalogItem } from '@/features/content3d/showcase/lib/mergeShowcaseCatalog'
import { planetsData } from '@/features/content3d/showcase/lib/solarSystemData'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { ShowcasePanelBlockDTO, ShowcasePanelConfigDTO } from '@/features/content3d/showcase/api/showcaseEntitiesApi'

type TabId = 'overview' | 'physical' | 'sky'

const DEFAULT_TABS: TabId[] = ['overview', 'physical', 'sky']
const DEFAULT_TAB_LABELS: Record<TabId, string> = {
  overview: 'Tổng quan',
  physical: 'Vật lý',
  sky: 'Bầu trời',
}

function formatNumber(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: digits })
}

function blockHasContent(b: ShowcasePanelBlockDTO): boolean {
  return Boolean(
    String(b.body || '').trim() ||
      String(b.title || '').trim() ||
      String(b.imageUrl || '').trim() ||
      (Array.isArray(b.points) && b.points.length > 0),
  )
}

function blocksHaveContent(blocks: ShowcasePanelBlockDTO[] | undefined): boolean {
  return Array.isArray(blocks) && blocks.some(blockHasContent)
}

const GROUP_LABEL_VI: Record<string, string> = {
  planets_moons: 'hành tinh · vệ tinh',
  dwarf_asteroids: 'hành tinh lùn · tiểu hành tinh',
  comets: 'sao chổi',
  spacecraft: 'tàu vũ trụ',
}

export function deriveExploreStateBadge(
  item: ResolvedNasaCatalogItem | null,
  orbit: ShowcaseOrbitEntity | null,
): string {
  if (!item) return ''
  if (item.group === 'spacecraft') {
    return 'Dữ liệu nhiệm vụ · theo dõi timeline trên lộ trình học'
  }
  const periodDays = Number(orbit?.orbitalElements?.periodDays ?? orbit?.periodDays ?? orbit?.period ?? 0)
  if (Number.isFinite(periodDays) && periodDays > 0) {
    const jpl = orbit?.orbitSource === 'jpl-horizons'
    return `Chu kỳ quỹ đạo ${formatNumber(periodDays, 1)} ngày${jpl ? ' · quỹ đạo đồng bộ JPL' : ''}`
  }
  const e = Number(orbit?.orbitalElements?.e ?? orbit?.orbitEccentricity ?? 0)
  if (Number.isFinite(e) && e > 0.001) {
    return `Độ lệch tâm ${formatNumber(e, 3)} · quỹ đạo ổn định`
  }
  const groupVi = GROUP_LABEL_VI[item.group] || item.group.replace(/_/g, ' ')
  return `Thực thể catalog · ${groupVi}`
}

function solarPlanetForItem(item: ResolvedNasaCatalogItem | null) {
  if (!item) return null
  const name = String(item.linkedPlanetName || item.name || '').trim()
  if (!name) return null
  return planetsData.find((p) => p.name === name) ?? null
}

function explorerBlurbForItem(item: ResolvedNasaCatalogItem | null): string {
  return String(solarPlanetForItem(item)?.explorerBlurb || '').trim()
}

function glassTextBlock(id: string, title: string, body: string): ShowcasePanelBlockDTO {
  return {
    id,
    type: 'text',
    title,
    body,
    style: { variant: 'glass', align: 'left' },
  }
}

function buildDefaultOverviewBlocks(
  item: ResolvedNasaCatalogItem | null,
  museumLabelVi: string,
): ShowcasePanelBlockDTO[] {
  const body =
    String(item?.museumBlurbVi || '').trim() ||
    String(museumLabelVi || '').trim() ||
    explorerBlurbForItem(item)
  if (!body) return []
  return [glassTextBlock('auto-overview', 'Tổng quan', body)]
}

function buildDefaultPhysicalBlocks(
  item: ResolvedNasaCatalogItem | null,
  orbit: ShowcaseOrbitEntity | null,
): ShowcasePanelBlockDTO[] {
  const points: Array<{ label: string; value: number }> = []
  const radiusKm = Number(orbit?.radiusKm ?? 0)
  if (Number.isFinite(radiusKm) && radiusKm > 0) {
    points.push({ label: 'Bán kính (km)', value: Math.round(radiusKm) })
  }
  const periodDays = Number(
    orbit?.orbitalElements?.periodDays ?? orbit?.periodDays ?? orbit?.period ?? 0,
  )
  if (Number.isFinite(periodDays) && periodDays > 0) {
    points.push({ label: 'Chu kỳ quỹ đạo (ngày)', value: periodDays })
  }
  const aAu = Number(orbit?.semiMajorAxisAu ?? orbit?.orbitalElements?.a ?? 0)
  if (Number.isFinite(aAu) && aAu > 0 && aAu < 500) {
    points.push({ label: 'Bán trục lớn (AU)', value: aAu })
  }
  const e = Number(orbit?.orbitalElements?.e ?? orbit?.orbitEccentricity ?? 0)
  if (Number.isFinite(e) && e >= 0) {
    points.push({ label: 'Độ lệch tâm', value: e })
  }
  const pd = solarPlanetForItem(item)
  if (pd && Number.isFinite(pd.distance)) {
    points.push({ label: 'Khoảng cách nhìn từ Mặt Trời (scene)', value: pd.distance })
  }
  if (points.length === 0) return []
  return [
    {
      id: 'auto-physical-chart',
      type: 'chart',
      title: 'Thông số chính',
      chartKind: 'bar',
      points,
      style: { variant: 'glass', align: 'left' },
    },
  ]
}

function buildDefaultSkyBlocks(): ShowcasePanelBlockDTO[] {
  return [
    glassTextBlock(
      'auto-sky-hint',
      'Lộ trình học',
      'Bài học và khái niệm gắn với thiên thể này hiện ở tab Bầu trời và footer. Tuỳ chỉnh nội dung chi tiết trong Studio → Panel content.',
    ),
  ]
}

/**
 * Explore panel: giữ CMS `panelConfig` khi đã có; nếu trống thì điền tab + block mặc định
 * (museum copy, explorer blurb, thông số quỹ đạo) — không xóa thiết kế UI của ShowcaseEntityPanel.
 */
export function resolveExplorePanelConfig(
  item: ResolvedNasaCatalogItem | null,
  orbit: ShowcaseOrbitEntity | null,
  cms: ShowcasePanelConfigDTO | null | undefined,
  museumLabelVi: string,
): ShowcasePanelConfigDTO | null {
  if (!item) return null

  const tabs =
    Array.isArray(cms?.tabs) && cms.tabs.length > 0
      ? (cms.tabs.filter((t): t is TabId => t === 'overview' || t === 'physical' || t === 'sky') as TabId[])
      : [...DEFAULT_TABS]

  const tabLabels = { ...DEFAULT_TAB_LABELS, ...(cms?.tabLabels || {}) }

  const overviewBlocks = blocksHaveContent(cms?.overviewBlocks)
    ? cms!.overviewBlocks!
    : buildDefaultOverviewBlocks(item, museumLabelVi)

  const physicalBlocks = blocksHaveContent(cms?.physicalBlocks)
    ? cms!.physicalBlocks!
    : buildDefaultPhysicalBlocks(item, orbit)

  const skyBlocks = blocksHaveContent(cms?.skyBlocks) ? cms!.skyBlocks! : buildDefaultSkyBlocks()

  const stateBadge = String(cms?.stateBadge || '').trim() || deriveExploreStateBadge(item, orbit)

  return {
    ...cms,
    stateBadge,
    tabs,
    tabLabels,
    overviewBlocks,
    physicalBlocks,
    skyBlocks,
    conceptTagIds: cms?.conceptTagIds || [],
    lessonIds: cms?.lessonIds || [],
  }
}
