function normalizeColorHex(raw, fallback = '') {
  const s = String(raw || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  return fallback
}

function normalizePanelBlock(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || `block-${index}`).trim().slice(0, 80)
  const type = ['text', 'image', 'chart'].includes(String(raw.type || '').trim())
    ? String(raw.type).trim()
    : 'text'
  const title = String(raw.title || '').trim().slice(0, 200)
  const body = String(raw.body || '').trim().slice(0, 8000)
  const imageUrl = String(raw.imageUrl || '').trim().slice(0, 500)
  const chartKind = String(raw.chartKind || '').trim().slice(0, 40)
  const points = (Array.isArray(raw.points) ? raw.points : [])
    .map((p) => ({
      label: String(p?.label || '').trim().slice(0, 80),
      value: Number(p?.value),
    }))
    .filter((p) => p.label && Number.isFinite(p.value))
    .slice(0, 24)
  const styleRaw = raw.style && typeof raw.style === 'object' ? raw.style : {}
  const style = {
    variant: ['glass', 'solid', 'minimal'].includes(String(styleRaw.variant || ''))
      ? styleRaw.variant
      : undefined,
    align: ['left', 'center', 'right'].includes(String(styleRaw.align || ''))
      ? styleRaw.align
      : undefined,
    bgColor: normalizeColorHex(styleRaw.bgColor, ''),
    borderColor: normalizeColorHex(styleRaw.borderColor, ''),
    textColor: normalizeColorHex(styleRaw.textColor, ''),
    accentColor: normalizeColorHex(styleRaw.accentColor, ''),
  }
  return { id, type, title, body, imageUrl, chartKind, points, style }
}

function normalizePanelConfig(raw) {
  if (!raw || typeof raw !== 'object') return null
  const stateBadge = String(raw?.stateBadge || '').trim().slice(0, 220)
  const tabsRaw = Array.isArray(raw?.tabs) ? raw.tabs : []
  const tabs = tabsRaw
    .map((t) => String(t || '').trim().toLowerCase())
    .filter((t) => ['overview', 'physical', 'sky'].includes(t))
    .slice(0, 3)
  const tabLabelsRaw = raw?.tabLabels && typeof raw.tabLabels === 'object' ? raw.tabLabels : {}
  const tabLabels = {
    overview: String(tabLabelsRaw.overview || '').trim().slice(0, 40),
    physical: String(tabLabelsRaw.physical || '').trim().slice(0, 40),
    sky: String(tabLabelsRaw.sky || '').trim().slice(0, 40),
  }
  const normBlocks = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((b, i) => normalizePanelBlock(b, i))
      .filter(Boolean)
      .slice(0, 16)
  const overviewBlocks = normBlocks(raw?.overviewBlocks)
  const physicalBlocks = normBlocks(raw?.physicalBlocks)
  const skyBlocks = normBlocks(raw?.skyBlocks)
  const conceptTagIds = (Array.isArray(raw?.conceptTagIds) ? raw.conceptTagIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 32)
  const lessonIds = (Array.isArray(raw?.lessonIds) ? raw.lessonIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 64)
  if (
    !stateBadge &&
    tabs.length === 0 &&
    overviewBlocks.length === 0 &&
    physicalBlocks.length === 0 &&
    skyBlocks.length === 0 &&
    conceptTagIds.length === 0 &&
    lessonIds.length === 0
  ) {
    return null
  }
  return {
    stateBadge,
    tabs,
    tabLabels,
    overviewBlocks,
    physicalBlocks,
    skyBlocks,
    conceptTagIds,
    lessonIds,
  }
}

module.exports = { normalizePanelConfig }
