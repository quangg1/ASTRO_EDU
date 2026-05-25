'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/public'
import { resolveLessonsForNarrativeEntity } from '@/features/content3d/showcase/public'
import { useLearningPath } from '@/features/learning-path/public'
import type { ReadonlyURLSearchParams } from 'next/navigation'

export function useExplorePlanetHistoryMode(
  planetHistoryOpen: boolean,
  planetHistoryEntityId: string | null,
  searchParams: ReadonlyURLSearchParams,
) {
  const loadPlanetNarrative = usePlanetNarrativeStore((s) => s.loadForEntity)
  const narrativeLoading = usePlanetNarrativeStore((s) => s.loading)
  const narrativeBeats = usePlanetNarrativeStore((s) => s.beats)
  const linkedLessonIds = usePlanetNarrativeStore((s) => s.linkedLessonIds)
  const currentBeatId = usePlanetNarrativeStore((s) => s.currentBeat.id)
  const focusBeatAndSite = usePlanetNarrativeStore((s) => s.focusBeatAndSite)
  const planetBeatAccent = usePlanetNarrativeStore((s) => s.currentBeat.accentColor)
  const appliedHistoryFocusRef = useRef<string | null>(null)
  const { modules, concepts } = useLearningPath()

  useEffect(() => {
    if (!planetHistoryOpen || !planetHistoryEntityId) return
    appliedHistoryFocusRef.current = null
    void loadPlanetNarrative(planetHistoryEntityId)
  }, [planetHistoryOpen, planetHistoryEntityId, loadPlanetNarrative])

  useEffect(() => {
    if (!planetHistoryOpen || narrativeLoading || narrativeBeats.length === 0) return
    const beatRaw = searchParams.get('beat')
    const pinRaw = searchParams.get('pin')?.trim() || null
    const key = `${planetHistoryEntityId}:${beatRaw ?? ''}:${pinRaw ?? ''}`
    if (appliedHistoryFocusRef.current === key) return
    if (beatRaw == null) {
      appliedHistoryFocusRef.current = key
      return
    }
    const beatId = parseInt(beatRaw, 10)
    if (!Number.isFinite(beatId)) return
    focusBeatAndSite(beatId, pinRaw)
    appliedHistoryFocusRef.current = key
  }, [
    planetHistoryOpen,
    planetHistoryEntityId,
    narrativeLoading,
    narrativeBeats.length,
    searchParams,
    focusBeatAndSite,
  ])

  const planetHistoryLessonLinks = useMemo(() => {
    if (!planetHistoryEntityId) return []
    return resolveLessonsForNarrativeEntity(modules, concepts, planetHistoryEntityId, {
      linkedLessonIds,
      beatId: currentBeatId,
    })
  }, [planetHistoryEntityId, modules, concepts, linkedLessonIds, currentBeatId])

  return {
    modules,
    concepts,
    planetBeatAccent,
    planetHistoryLessonLinks,
  }
}
