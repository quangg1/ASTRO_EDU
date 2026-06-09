/**
 * Thuật ngữ phân vị địa chất — hiển thị tiếng Việt trên Deep History (Explore).
 * Hỗ trợ cả khóa ICS tiếng Anh (DB/legacy) và chuỗi đã Việt hóa.
 */

const EON_VI: Record<string, string> = {
  Hadean: 'Đại Hadean',
  Archean: 'Đại Cổ Sinh',
  Proterozoic: 'Đại Tiền Sinh',
  Phanerozoic: 'Đại Hiển Sinh',
  'Đại Hadean': 'Đại Hadean',
  'Đại Cổ Sinh': 'Đại Cổ Sinh',
  'Đại Tiền Sinh': 'Đại Tiền Sinh',
  'Đại Hiển Sinh': 'Đại Hiển Sinh',
  'Sao Hỏa': 'Sao Hỏa',
}

const ERA_VI: Record<string, string> = {
  Neoproterozoic: 'Kỷ Tân Tiền Sinh',
  Paleozoic: 'Kỷ Cổ Sinh',
  Mesozoic: 'Kỷ Trung Sinh',
  Cenozoic: 'Kỷ Tân Sinh',
  'Kỷ Tân Tiền Sinh': 'Kỷ Tân Tiền Sinh',
  'Kỷ Cổ Sinh': 'Kỷ Cổ Sinh',
  'Kỷ Trung Sinh': 'Kỷ Trung Sinh',
  'Kỷ Tân Sinh': 'Kỷ Tân Sinh',
  'Thời đại thám hiểm': 'Thời đại thám hiểm',
  'Thời đại rover': 'Thời đại rover',
}

const PERIOD_VI: Record<string, string> = {
  Cryogenian: 'Kỳ Băng hà',
  Cambrian: 'Kỳ Cambri',
  Ordovician: 'Kỳ Ordovi',
  Devonian: 'Kỳ Devon',
  Carboniferous: 'Kỳ Than Đá',
  Permian: 'Kỳ Permi',
  Triassic: 'Kỳ Tam Điệp',
  Jurassic: 'Kỳ Jura',
  Cretaceous: 'Kỳ Phấn trắng',
  Paleogene: 'Kỳ Cổ Tân',
  Neogene: 'Kỳ Tân Tân',
  Quaternary: 'Kỳ Đệ Tứ',
  Pleistocene: 'Kỳ Pleistocene',
  Holocene: 'Kỳ Holocene',
  'Hình thành sớm': 'Hình thành sớm',
  'Kỷ Noachian': 'Kỷ Noachian',
  'Kỷ Noachian muộn': 'Kỷ Noachian muộn',
  'Kỷ Hesperian': 'Kỷ Hesperian',
  'Kỷ Amazonian': 'Kỷ Amazonian',
  'Quỹ đạo & quan sát': 'Quỹ đạo & quan sát',
  'Curiosity tại Gale': 'Curiosity tại Gale',
  'Perseverance tại Jezero': 'Perseverance tại Jezero',
  'Kỳ Băng hà': 'Kỳ Băng hà',
  'Kỳ Cambri': 'Kỳ Cambri',
  'Kỳ Ordovi': 'Kỳ Ordovi',
  'Kỳ Devon': 'Kỳ Devon',
  'Kỳ Than Đá': 'Kỳ Than Đá',
  'Kỳ Permi': 'Kỳ Permi',
  'Kỳ Tam Điệp': 'Kỳ Tam Điệp',
  'Kỳ Jura': 'Kỳ Jura',
  'Kỳ Phấn trắng': 'Kỳ Phấn trắng',
  'Kỳ Cổ Tân': 'Kỳ Cổ Tân',
  'Kỳ Tân Tân': 'Kỳ Tân Tân',
  'Kỳ Đệ Tứ': 'Kỳ Đệ Tứ',
}

export function geologicEonVi(eon: string | null | undefined): string | null {
  if (!eon?.trim()) return null
  const key = eon.trim()
  return EON_VI[key] ?? key
}

export function geologicEraVi(era: string | null | undefined): string | null {
  if (!era?.trim()) return null
  const key = era.trim()
  return ERA_VI[key] ?? key
}

export function geologicPeriodVi(period: string | null | undefined): string | null {
  if (!period?.trim()) return null
  const key = period.trim()
  return PERIOD_VI[key] ?? key
}

/** Chuỗi phân vị cho panel — Đại · Kỷ · Kỳ. */
export function formatGeologicLabelVi(parts: {
  eon?: string | null
  era?: string | null
  period?: string | null
  epoch?: string | null
}): string {
  return [
    geologicEonVi(parts.eon),
    geologicEraVi(parts.era),
    geologicPeriodVi(parts.period),
    parts.epoch?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Phân vị địa chất Sao Hỏa theo beat id (preset legacy). */
export const MARS_BEAT_GEO_VI: Record<
  number,
  { eon: string; era?: string; period?: string }
> = {
  1: { eon: 'Sao Hỏa', period: 'Hình thành sớm' },
  2: { eon: 'Sao Hỏa', period: 'Kỷ Noachian' },
  3: { eon: 'Sao Hỏa', period: 'Kỷ Noachian muộn' },
  4: { eon: 'Sao Hỏa', period: 'Kỷ Hesperian' },
  5: { eon: 'Sao Hỏa', period: 'Kỷ Hesperian' },
  6: { eon: 'Sao Hỏa', period: 'Kỷ Amazonian' },
  7: { eon: 'Sao Hỏa', period: 'Kỷ Amazonian' },
  8: { eon: 'Sao Hỏa', era: 'Thời đại thám hiểm', period: 'Quỹ đạo & quan sát' },
  9: { eon: 'Sao Hỏa', era: 'Thời đại rover', period: 'Curiosity tại Gale' },
  10: { eon: 'Sao Hỏa', era: 'Thời đại rover', period: 'Perseverance tại Jezero' },
}
