import supplement from '@/data/vn-universities-supplement.json'
import type { HipolabsUniversity } from '@/lib/hipolabsUniversities'

export type VnUniversitySupplement = {
  name: string
  nameVi: string
  aliases: string[]
  domains: string[]
  country: string
  alpha_two_code: string
  'state-province': string | null
}

const VN_SUPPLEMENT = supplement as VnUniversitySupplement[]

export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function supplementToHipolabs(row: VnUniversitySupplement): HipolabsUniversity {
  return {
    name: row.nameVi ? `${row.nameVi} (${row.name})` : row.name,
    country: row.country,
    alpha_two_code: row.alpha_two_code,
    domains: row.domains,
    web_pages: row.domains.map((d) => `https://${d}`),
    'state-province': row['state-province'],
  }
}

export function searchVnUniversitySupplement(
  query: string,
  countryFilter?: string,
): HipolabsUniversity[] {
  const q = foldVietnamese(query)
  if (q.length < 2) return []

  const countryOk = (row: VnUniversitySupplement) => {
    if (!countryFilter?.trim()) return true
    return foldVietnamese(row.country) === foldVietnamese(countryFilter)
  }

  const haystack = (row: VnUniversitySupplement) =>
    [row.name, row.nameVi, ...(row.aliases || []), ...(row.domains || [])]
      .filter(Boolean)
      .map(foldVietnamese)
      .join(' ')

  const matches = (stack: string) => {
    if (stack.includes(q)) return true
    const words = q.split(/\s+/).filter((w) => w.length >= 2)
    return words.length > 0 && words.every((w) => stack.includes(w))
  }

  return VN_SUPPLEMENT.filter((row) => countryOk(row) && matches(haystack(row))).map(
    supplementToHipolabs,
  )
}

export function mergeUniversityResults(
  ...lists: HipolabsUniversity[][]
): HipolabsUniversity[] {
  const seen = new Set<string>()
  const out: HipolabsUniversity[] = []
  for (const list of lists) {
    for (const u of list) {
      const key = `${foldVietnamese(u.name)}|${u.domains?.[0] ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(u)
    }
  }
  return out
}
