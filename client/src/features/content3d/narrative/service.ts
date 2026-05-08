import { fetchEarthHistoryStages } from '@/features/content3d/earth/api/earthHistoryApi'
import { getApiPathBase } from '@/lib/apiConfig'
import { EARTH_HISTORY_PRESET } from '@/features/content3d/narrative/presets/earth'
import type { NarrativeBeat, NarrativeSpace } from '@/features/content3d/narrative/types'

async function fetchNarrativeSpaceFromApi(slug: string): Promise<NarrativeSpace | null> {
  const base = getApiPathBase()
  try {
    const res = await fetch(`${base}/narrative-spaces/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    const json = await res.json().catch(() => null)
    const data = json?.data as Partial<NarrativeSpace> | undefined
    if (
      json?.success &&
      data &&
      Array.isArray(data.beats) &&
      data.beats.length > 0
    ) {
      const preset: NarrativeSpace =
        slug === 'earth-history'
          ? EARTH_HISTORY_PRESET
          : {
              ...EARTH_HISTORY_PRESET,
              id: data.id ?? `space-${slug}`,
              slug: data.slug ?? slug,
              title: data.title ?? { vi: slug, en: slug },
              templateId: data.templateId ?? 'custom',
              world: data.world ?? { bodySlug: 'earth' },
              sequence: data.sequence ?? { type: 'geologic_ma', unit: 'Ma' },
              version: data.version ?? '1',
            }
      return {
        ...preset,
        ...data,
        beats: data.beats as NarrativeBeat[],
      }
    }
  } catch {
    /* unified API down */
  }

  if (slug !== 'earth-history') return null

  const beats = await fetchEarthHistoryStages()
  if (!beats.length) return null

  return {
    ...EARTH_HISTORY_PRESET,
    beats,
    version: 'api-bridge-v1',
  }
}

export class NarrativeSpaceService {
  async getActiveSpace(slug: string): Promise<NarrativeSpace> {
    const apiSpace = await fetchNarrativeSpaceFromApi(slug)
    if (apiSpace) return apiSpace
    if (slug === 'earth-history') return EARTH_HISTORY_PRESET
    return {
      ...EARTH_HISTORY_PRESET,
      id: `fallback-${slug}`,
      slug,
      title: { vi: slug, en: slug },
    }
  }

  getBeatByTime(beats: NarrativeBeat[], time: number): NarrativeBeat | undefined {
    const exact = beats.find((b) => b.time === time)
    if (exact) return exact
    const tolerance = time >= 1 ? time * 0.1 : 0.5
    return beats.find((b) => Math.abs(b.time - time) <= tolerance)
  }

  getBeatById(beats: NarrativeBeat[], id: number): NarrativeBeat | undefined {
    return beats.find((b) => b.id === id)
  }
}

export const narrativeSpaceService = new NarrativeSpaceService()
