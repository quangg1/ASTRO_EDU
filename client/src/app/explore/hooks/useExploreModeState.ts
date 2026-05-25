'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ExploreSceneMode } from './types'

export function useExploreModeState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const bridgeDebugOn = searchParams.get('bridgeDebug') === '1'

  const historyEntityFromUrl = useMemo(() => {
    const e = searchParams.get('entity')?.trim()
    if (searchParams.get('history') === '1' && e) return e
    return null
  }, [searchParams])

  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const [planetHistoryEntityId, setPlanetHistoryEntityId] = useState<string | null>(historyEntityFromUrl)
  const [planetHistoryOpen, setPlanetHistoryOpen] = useState(!!historyEntityFromUrl)
  const [showcaseMenuOpen, setShowcaseMenuOpen] = useState(false)
  const [showcaseActiveItemId, setShowcaseActiveItemId] = useState('planet-earth')
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(2)

  const sceneMode: ExploreSceneMode = earthHistoryOpen
    ? 'earth'
    : planetHistoryOpen
      ? 'planet-history'
      : 'showcase'

  const openPlanetHistory = useCallback(
    (entityId: string, focus?: { beatId?: number; pinId?: string }) => {
      setPlanetHistoryEntityId(entityId)
      setPlanetHistoryOpen(true)
      setEarthHistoryOpen(false)
      setShowcaseActiveItemId(entityId)
      const next = new URLSearchParams(searchParams.toString())
      next.set('mode', 'showcase')
      next.set('entity', entityId)
      next.set('history', '1')
      next.delete('stage')
      if (focus?.beatId != null && Number.isFinite(focus.beatId)) {
        next.set('beat', String(Math.round(focus.beatId)))
      } else {
        next.delete('beat')
      }
      if (focus?.pinId?.trim()) next.set('pin', focus.pinId.trim())
      else next.delete('pin')
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const closePlanetHistory = useCallback(() => {
    setPlanetHistoryOpen(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('history')
    next.delete('beat')
    next.delete('pin')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  return {
    pathname,
    router,
    searchParams,
    stageTime,
    bridgeDebugOn,
    earthHistoryOpen,
    setEarthHistoryOpen,
    planetHistoryOpen,
    setPlanetHistoryOpen,
    planetHistoryEntityId,
    setPlanetHistoryEntityId,
    showcaseMenuOpen,
    setShowcaseMenuOpen,
    showcaseActiveItemId,
    setShowcaseActiveItemId,
    selectedSolarPlanetIndex,
    setSelectedSolarPlanetIndex,
    sceneMode,
    openPlanetHistory,
    closePlanetHistory,
  }
}
