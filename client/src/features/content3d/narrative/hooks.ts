import { useEffect, useMemo } from 'react'
import { useNarrativeStore } from '@/features/content3d/narrative/store'
import { narrativeSpaceService } from '@/features/content3d/narrative/service'

export function useNarrativeSpace(slug = 'earth-history') {
  const state = useNarrativeStore()
  useEffect(() => {
    if (state.slug !== slug) state.setSlug(slug)
    void state.loadSpace(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const getBeatByRef = useMemo(
    () => ({
      byTime: (time: number) => narrativeSpaceService.getBeatByTime(state.beats, time),
      byId: (id: number) => narrativeSpaceService.getBeatById(state.beats, id),
    }),
    [state.beats],
  )

  return {
    ...state,
    getBeatByRef,
  }
}
