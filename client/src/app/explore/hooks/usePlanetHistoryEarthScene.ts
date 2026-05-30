'use client'

import { useEffect, useMemo, useState } from 'react'
import { beatToEarthStage } from '@/features/content3d/narrative/adapters/earthAdapter'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import { fetchFossilsForStage } from '@/features/content3d/earth/api/earthApi'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import type { EarthStage, Fossil } from '@/features/content3d/earth/lib/earthHistoryTypes'

const EARTH_ENTITY_ID = 'planet-earth'

/** Deep History Earth: stage + fossils theo beat đang chọn (thay cho showcase globe). */
export function usePlanetHistoryEarthScene(
  planetHistoryOpen: boolean,
  planetHistoryEntityId: string | null,
) {
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const narrativeEntityId = usePlanetNarrativeStore((s) => s.entityId)
  const active =
    planetHistoryOpen &&
    planetHistoryEntityId === EARTH_ENTITY_ID &&
    narrativeEntityId === EARTH_ENTITY_ID

  const stage = useMemo(
    () => (active ? beatToEarthStage(currentBeat) : null),
    [active, currentBeat],
  )

  const [fossils, setFossils] = useState<Fossil[]>([])
  const [fossilsLoading, setFossilsLoading] = useState(false)

  useEffect(() => {
    if (!active) return
    useSceneCommandStore.getState().loadPhylumMetadata()
    useSceneCommandStore.setState({ showFossils: true, showFossilPanel: true })
  }, [active])

  useEffect(() => {
    if (!active || !stage) {
      setFossils([])
      return
    }

    useSceneCommandStore.getState().clearAllGlobeFossilUi()

    let cancelled = false
    setFossilsLoading(true)
    useSceneCommandStore.getState().setFossilsLoading(true)
    void fetchFossilsForStage(stage).then(({ fossils: list, total }) => {
      if (cancelled) return
      setFossils(list)
      const byPhylum = list.reduce(
        (acc, f) => {
          const p = f.phylum || 'Unknown'
          acc[p] = (acc[p] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
      useSceneCommandStore.getState().setFossils(list)
      useSceneCommandStore.getState().setFossilStats(
        total > 0 || list.length > 0 ? { total: total || list.length, byPhylum } : { total: 0, byPhylum: {} },
      )
      useSceneCommandStore.getState().setFossilsLoading(false)
      setFossilsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [active, stage?.id, stage?.time, stage?.maxMa, stage?.minMa])

  return {
    earthHistorySceneActive: active,
    earthHistoryStage: stage,
    earthHistoryFossils: fossils,
    earthHistoryFossilsLoading: fossilsLoading,
  }
}
