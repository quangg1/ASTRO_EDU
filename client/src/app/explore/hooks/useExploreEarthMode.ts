'use client'

import { useEffect, useRef } from 'react'
import {
  useEarthHistoryStore,
  useExploreStageFossils,
  usePlaybackStore,
  useSceneCommandStore,
} from '@/features/content3d/earth/public'

export function useExploreEarthMode(
  earthHistoryOpen: boolean,
  planetHistoryOpen: boolean,
  stageTime: number | null,
) {
  const loadStages = useEarthHistoryStore((s) => s.loadStages)
  const stages = useEarthHistoryStore((s) => s.stages)
  const stagesLoading = useEarthHistoryStore((s) => s.loading)
  const setStage = useEarthHistoryStore((s) => s.setStageIndex)
  const appliedStageRef = useRef<number | null>(null)

  useEffect(() => {
    if (!earthHistoryOpen) return
    void loadStages()
  }, [earthHistoryOpen, loadStages])

  useExploreStageFossils(earthHistoryOpen)

  useEffect(() => {
    if (earthHistoryOpen) return
    useSceneCommandStore.getState().clearAllGlobeFossilUi()
  }, [earthHistoryOpen])

  useEffect(() => {
    if (!planetHistoryOpen) return
    usePlaybackStore.setState({ isPlaying: false })
  }, [planetHistoryOpen])

  useEffect(() => {
    if (stageTime == null) {
      appliedStageRef.current = null
      return
    }
    if (stagesLoading || stages.length === 0) return
    if (appliedStageRef.current === stageTime) return
    const idx = stages.findIndex((s) => s.time === stageTime)
    const index =
      idx >= 0
        ? idx
        : stages.reduce(
            (best, s, i) =>
              Math.abs(s.time - stageTime) < Math.abs(stages[best].time - stageTime) ? i : best,
            0,
          )
    setStage(index)
    appliedStageRef.current = stageTime
  }, [stageTime, stagesLoading, stages, setStage])
}
