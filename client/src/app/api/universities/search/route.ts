import { NextRequest, NextResponse } from 'next/server'
import {
  foldVietnamese,
  mergeUniversityResults,
  searchVnUniversitySupplement,
} from '@/lib/vnUniversitySearch'

const HIPOLABS_BASE = 'http://universities.hipolabs.com'
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 25

export type HipolabsUniversityRow = {
  name: string
  country: string
  alpha_two_code: string
  domains: string[]
  web_pages: string[]
  'state-province': string | null
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim() ?? ''
  const country = req.nextUrl.searchParams.get('country')?.trim() ?? ''
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : DEFAULT_LIMIT

  if (name.length < 2) {
    return NextResponse.json({ success: true, data: [] })
  }

  const local = searchVnUniversitySupplement(name, country || undefined)
  const folded = foldVietnamese(name)
  const terms = folded !== name.toLowerCase() ? [name, folded] : [name]

  const hipolabsChunks: HipolabsUniversityRow[] = []
  for (const term of terms) {
    const params = new URLSearchParams({ name: term, limit: String(limit) })
    if (country) params.set('country', country)
    try {
      const upstream = await fetch(`${HIPOLABS_BASE}/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      })
      if (upstream.ok) {
        const chunk = (await upstream.json()) as HipolabsUniversityRow[]
        if (Array.isArray(chunk)) hipolabsChunks.push(...chunk)
      }
    } catch {
      /* optional */
    }
    if (hipolabsChunks.length >= limit) break
  }

  const data = mergeUniversityResults(local, hipolabsChunks).slice(0, limit)
  return NextResponse.json({ success: true, data })
}
