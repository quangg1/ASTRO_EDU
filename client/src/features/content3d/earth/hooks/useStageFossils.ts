'use client'

import { useEffect, useState } from 'react'
import { fetchFossilsForStage } from '../api/earthApi'
import { useEarthHistoryStore } from '../stores/earthHistoryStore'
import { useSceneCommandStore } from '../stores/sceneCommandStore'
import type { EarthStage, Fossil } from '../lib/earthHistoryTypes'

/**
 * Explore orchestrator: load fossils into scene command store (keeps 3D layer presentational).
 */
export function useExploreStageFossils(active: boolean) {
  const currentStage = useEarthHistoryStore((s) => s.currentStage)
  const setFossils = useSceneCommandStore((s) => s.setFossils)
  const setFossilStats = useSceneCommandStore((s) => s.setFossilStats)
  const setFossilsLoading = useSceneCommandStore((s) => s.setFossilsLoading)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const load = async () => {
      setFossilsLoading(true)
      const { fossils: list, total } = await fetchFossilsForStage(currentStage)
      if (cancelled) return
      setFossils(list)
      if (list.length > 0 || total > 0) {
        const byPhylum = list.reduce(
          (acc, f) => {
            const p = f.phylum || 'Unknown'
            acc[p] = (acc[p] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        setFossilStats({ total, byPhylum })
      } else {
        setFossilStats({ total: 0, byPhylum: {} })
      }
      setFossilsLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [
    active,
    currentStage.id,
    currentStage.time,
    currentStage.maxMa,
    currentStage.minMa,
    setFossils,
    setFossilStats,
    setFossilsLoading,
  ])
}

/** Course lesson embed: fossils for `EarthScene` override props. */
export function useCourseStageFossils(stage: EarthStage | null | undefined) {
  const [fossils, setFossils] = useState<Fossil[]>([])

  useEffect(() => {
    if (!stage) {
      setFossils([])
      return
    }
    let cancelled = false
    void fetchFossilsForStage(stage).then(({ fossils: list }) => {
      if (!cancelled) setFossils(list)
    })
    return () => {
      cancelled = true
    }
  }, [stage?.id, stage?.time, stage?.name])

  return fossils
}
