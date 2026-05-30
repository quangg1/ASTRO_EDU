/** Row from Hipolabs Universities API — https://github.com/Hipo/university-domains-list */

export type HipolabsUniversity = {
  name: string
  country: string
  alpha_two_code: string
  domains: string[]
  web_pages: string[]
  'state-province': string | null
}

export type UniversitySearchOptions = {
  name: string
  country?: string
  limit?: number
}

/** Search via Next proxy (avoids browser CORS / mixed content). */
export async function searchUniversities(
  options: UniversitySearchOptions,
): Promise<{ success: boolean; data?: HipolabsUniversity[]; error?: string }> {
  const q = options.name.trim()
  if (q.length < 2) {
    return { success: true, data: [] }
  }
  const params = new URLSearchParams({ name: q })
  if (options.country?.trim()) params.set('country', options.country.trim())
  if (options.limit != null) params.set('limit', String(options.limit))

  try {
    const res = await fetch(`/api/universities/search?${params.toString()}`, {
      cache: 'no-store',
    })
    const body = await res.json()
    if (!res.ok) {
      return { success: false, error: body.error || 'Không tra cứu được danh sách trường' }
    }
    return { success: true, data: Array.isArray(body.data) ? body.data : [] }
  } catch {
    return { success: false, error: 'Không kết nối được dịch vụ tra cứu trường' }
  }
}
