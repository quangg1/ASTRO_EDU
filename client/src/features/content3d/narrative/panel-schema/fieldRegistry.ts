import type { NarrativeFieldKind } from '@/features/content3d/narrative/panel-schema/types'

export type RegistrySelectOption = { value: string; labelVi: string }

export interface NarrativeFieldRegistryEntry {
  path: string
  kind: NarrativeFieldKind
  defaultLabelVi: string
  defaultLabelEn?: string
  placeholder?: string
  /** select / slider */
  options?: readonly RegistrySelectOption[] | readonly string[]
  sliderMin?: number
  sliderMax?: number
  sliderStep?: number
  /** Ẩn khi giá trị rỗng (preview badge) */
  hideWhenEmpty?: boolean
  formatBadge?: (raw: unknown) => string
}

const WATER_OPTS: RegistrySelectOption[] = [
  { value: 'none', labelVi: 'Không / rất ít' },
  { value: 'rare', labelVi: 'Rất hiếm' },
  { value: 'regional', labelVi: 'Khu trú' },
  { value: 'widespread', labelVi: 'Rộng' },
  { value: 'unknown', labelVi: 'Chưa rõ' },
]

const VOL_OPTS: RegistrySelectOption[] = [
  { value: 'low', labelVi: 'Thấp' },
  { value: 'moderate', labelVi: 'Trung bình' },
  { value: 'high', labelVi: 'Cao' },
  { value: 'dominant', labelVi: 'Thống trị' },
]

const CONF_OPTS: RegistrySelectOption[] = [
  { value: 'consensus', labelVi: 'Đồng thuận' },
  { value: 'model', labelVi: 'Mô hình' },
  { value: 'hypothesis', labelVi: 'Giả thuyết' },
]

const PRESSURE_BASIS_OPTS: RegistrySelectOption[] = [
  { value: 'measured_global_average', labelVi: 'Đo được (TB)' },
  { value: 'model_range', labelVi: 'Mô hình (khoảng)' },
  { value: 'hypothesis_range', labelVi: 'Giả thuyết (khoảng)' },
]

export const NARRATIVE_FIELD_REGISTRY: Record<string, NarrativeFieldRegistryEntry> = {
  name: { path: 'name', kind: 'text', defaultLabelVi: 'Tên hiển thị' },
  nameEn: { path: 'nameEn', kind: 'text', defaultLabelVi: 'Tên (EN)' },
  icon: { path: 'icon', kind: 'icon', defaultLabelVi: 'Biểu tượng' },
  accentColor: { path: 'accentColor', kind: 'color', defaultLabelVi: 'Màu nhấn panel' },
  ageLabelVi: { path: 'ageLabelVi', kind: 'text', defaultLabelVi: 'Nhãn thời gian' },
  timeMa: { path: 'timeMa', kind: 'number', defaultLabelVi: 'Tuổi đại diện (Ma, max)' },
  timeMaEnd: { path: 'timeMaEnd', kind: 'number', defaultLabelVi: 'Tuổi kết thúc (Ma, min)', hideWhenEmpty: true },

  'environment.eon': { path: 'environment.eon', kind: 'text', defaultLabelVi: 'Eon', hideWhenEmpty: true },
  'environment.era': { path: 'environment.era', kind: 'text', defaultLabelVi: 'Era', hideWhenEmpty: true },
  'environment.period': { path: 'environment.period', kind: 'text', defaultLabelVi: 'Period', hideWhenEmpty: true },
  'environment.epoch': { path: 'environment.epoch', kind: 'text', defaultLabelVi: 'Epoch', hideWhenEmpty: true },

  'panel.descriptionVi': {
    path: 'panel.descriptionVi',
    kind: 'textarea',
    defaultLabelVi: 'Mô tả chính',
  },
  'panel.compareNoteVi': {
    path: 'panel.compareNoteVi',
    kind: 'textarea',
    defaultLabelVi: 'So sánh / bối cảnh',
  },
  'panel.environmentNoteVi': {
    path: 'panel.environmentNoteVi',
    kind: 'textarea',
    defaultLabelVi: 'Ghi chú môi trường',
  },
  'panel.pressureCitationVi': {
    path: 'panel.pressureCitationVi',
    kind: 'textarea',
    defaultLabelVi: 'Trích dẫn áp suất / nguồn',
    hideWhenEmpty: true,
  },
  'panel.surfaceTempNoteVi': {
    path: 'panel.surfaceTempNoteVi',
    kind: 'textarea',
    defaultLabelVi: 'Ghi chú nhiệt bề mặt',
    hideWhenEmpty: true,
  },

  'environment.confidence': {
    path: 'environment.confidence',
    kind: 'select',
    defaultLabelVi: 'Độ tin cậy',
    options: CONF_OPTS,
    formatBadge: (v) => CONF_OPTS.find((o) => o.value === v)?.labelVi ?? String(v ?? ''),
  },
  'environment.liquidWater': {
    path: 'environment.liquidWater',
    kind: 'select',
    defaultLabelVi: 'Nước lỏng',
    options: WATER_OPTS,
    formatBadge: (v) => WATER_OPTS.find((o) => o.value === v)?.labelVi ?? String(v ?? ''),
  },
  'environment.volcanism': {
    path: 'environment.volcanism',
    kind: 'select',
    defaultLabelVi: 'Núi lửa',
    options: VOL_OPTS,
    formatBadge: (v) => VOL_OPTS.find((o) => o.value === v)?.labelVi ?? String(v ?? ''),
  },
  'environment.surfacePressureBasis': {
    path: 'environment.surfacePressureBasis',
    kind: 'select',
    defaultLabelVi: 'Cơ sở áp suất',
    options: PRESSURE_BASIS_OPTS,
  },
  'environment.surfacePressureRepresentativePa': {
    path: 'environment.surfacePressureRepresentativePa',
    kind: 'number',
    defaultLabelVi: 'Áp đại diện (Pa)',
    formatBadge: (v) => (v != null && v !== '' ? `~${Math.round(Number(v)).toLocaleString('vi-VN')} Pa` : ''),
    hideWhenEmpty: true,
  },
  'environment.surfacePressureLowPa': {
    path: 'environment.surfacePressureLowPa',
    kind: 'number',
    defaultLabelVi: 'Áp min (Pa)',
    hideWhenEmpty: true,
  },
  'environment.surfacePressureHighPa': {
    path: 'environment.surfacePressureHighPa',
    kind: 'number',
    defaultLabelVi: 'Áp max (Pa)',
    hideWhenEmpty: true,
  },
  'environment.o2Percent': {
    path: 'environment.o2Percent',
    kind: 'number',
    defaultLabelVi: 'O₂ (%)',
    formatBadge: (v) => (v != null && v !== '' ? `${v}%` : ''),
    hideWhenEmpty: true,
  },
  'environment.co2Ppm': {
    path: 'environment.co2Ppm',
    kind: 'number',
    defaultLabelVi: 'CO₂ (ppm)',
    formatBadge: (v) => (v != null && v !== '' ? `${v} ppm` : ''),
    hideWhenEmpty: true,
  },
  'environment.dayLengthHours': {
    path: 'environment.dayLengthHours',
    kind: 'number',
    defaultLabelVi: 'Độ dài ngày (giờ)',
    formatBadge: (v) => (v != null && v !== '' ? `${v} h` : ''),
    hideWhenEmpty: true,
  },
  'environment.surfaceTempMinC': {
    path: 'environment.surfaceTempMinC',
    kind: 'number',
    defaultLabelVi: 'Nhiệt °C (min)',
  },
  'environment.surfaceTempMaxC': {
    path: 'environment.surfaceTempMaxC',
    kind: 'number',
    defaultLabelVi: 'Nhiệt °C (max)',
  },
  'environment.dustActivity': {
    path: 'environment.dustActivity',
    kind: 'number',
    defaultLabelVi: 'Bão bụi (0–3)',
    hideWhenEmpty: true,
    formatBadge: (v) => (v != null && v !== '' ? `Mức ${v}/3` : ''),
  },

  'visual.globeTint': { path: 'visual.globeTint', kind: 'color', defaultLabelVi: 'Màu globe' },
  'visual.atmosphereColor': { path: 'visual.atmosphereColor', kind: 'color', defaultLabelVi: 'Màu khí quyển' },
  'visual.atmosphereThickness': {
    path: 'visual.atmosphereThickness',
    kind: 'slider',
    defaultLabelVi: 'Độ dày vỏ khí',
    sliderMin: 0,
    sliderMax: 1,
    sliderStep: 0.01,
  },
  'visual.waterCoverage': {
    path: 'visual.waterCoverage',
    kind: 'slider',
    defaultLabelVi: 'Lớp nước / biển',
    sliderMin: 0,
    sliderMax: 1,
    sliderStep: 0.01,
  },
  'visual.dustOpacity': {
    path: 'visual.dustOpacity',
    kind: 'slider',
    defaultLabelVi: 'Bụi / sương',
    sliderMin: 0,
    sliderMax: 1,
    sliderStep: 0.01,
  },
  'visual.volcanicGlow': {
    path: 'visual.volcanicGlow',
    kind: 'slider',
    defaultLabelVi: 'Phát sáng núi lửa',
    sliderMin: 0,
    sliderMax: 1,
    sliderStep: 0.01,
  },
  'visual.textureUrl': { path: 'visual.textureUrl', kind: 'media-url', defaultLabelVi: 'Texture URL' },
  'visual.cloudTextureUrl': {
    path: 'visual.cloudTextureUrl',
    kind: 'media-url',
    defaultLabelVi: 'Cloud texture URL',
  },
}

export function registryEntryForPath(path: string): NarrativeFieldRegistryEntry | null {
  return NARRATIVE_FIELD_REGISTRY[path] ?? null
}

export function allRegistryPaths(): string[] {
  return Object.keys(NARRATIVE_FIELD_REGISTRY)
}
