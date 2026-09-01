'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseExploreView, buildExploreHref, mergeExplorePreservedParams, normalizeSkyTargetId } from '@/features/explore/public'
import { useShowcaseStore } from '@/features/content3d/showcase/public'
import { DEFAULT_WESTERN_SKY_TARGET_ID } from '@/features/explore/public'
import type { ExploreSceneMode } from './types'

const DEFAULT_SKY_TARGET = DEFAULT_WESTERN_SKY_TARGET_ID

export function useExploreModeState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const exploreView = useMemo(
    () => parseExploreView(searchParams.get('view')),
    [searchParams],
  )

  const stageParam = searchParams.get('stage')
  const stageTime = stageParam != null ? parseFloat(stageParam) : null
  const bridgeDebugOn = searchParams.get('bridgeDebug') === '1'

  const historyEntityFromUrl = useMemo(() => {
    const e = searchParams.get('entity')?.trim()
    if (searchParams.get('history') === '1' && e) return e
    return null
  }, [searchParams])

  /** Mở Lịch sử sâu ngay khi bấm — tránh race với URL sync trước khi `?history=1` kịp apply. */
  const [planetHistoryPendingId, setPlanetHistoryPendingId] = useState<string | null>(null)

  const planetHistoryEntityId = historyEntityFromUrl ?? planetHistoryPendingId
  const planetHistoryOpen = planetHistoryEntityId != null

  const targetFromUrl = useMemo(() => {
    if (exploreView !== 'sky') {
      const t = searchParams.get('target')?.trim()
      return t || null
    }
    return normalizeSkyTargetId(searchParams.get('target'))
  }, [searchParams, exploreView])

  const entityFromUrl = useMemo(() => searchParams.get('entity')?.trim() || null, [searchParams])

  const [earthHistoryOpen, setEarthHistoryOpen] = useState(!!stageTime)
  const [showcaseMenuOpen, setShowcaseMenuOpen] = useState(false)
  const [showcaseActiveItemId, setShowcaseActiveItemId] = useState('planet-earth')
  const [skyActiveTargetId, setSkyActiveTargetId] = useState(DEFAULT_SKY_TARGET)
  /** Sao/hành tinh chọn tạm trên canvas — không thay chòm đang ghim từ HUD. */
  const [skySceneHighlightId, setSkySceneHighlightId] = useState<string | null>(null)
  const [selectedSolarPlanetIndex, setSelectedSolarPlanetIndex] = useState<number | null>(2)

  useEffect(() => {
    if (historyEntityFromUrl) {
      setPlanetHistoryPendingId(null)
    }
    if (stageParam != null && stageParam !== '') {
      setEarthHistoryOpen(true)
    }
    if (historyEntityFromUrl) {
      setShowcaseActiveItemId(historyEntityFromUrl)
    }
    if (entityFromUrl && exploreView === 'solar' && !useShowcaseStore.getState().storyTourActive) {
      setShowcaseActiveItemId(entityFromUrl)
    }
    if (targetFromUrl && exploreView === 'sky') {
      setSkyActiveTargetId(targetFromUrl)
      setSkySceneHighlightId(null)
    }
  }, [stageParam, historyEntityFromUrl, entityFromUrl, targetFromUrl, exploreView])

  useEffect(() => {
    if (exploreView !== 'sky') return
    const hasSolarNoise =
      searchParams.get('entity') ||
      searchParams.get('mode') ||
      searchParams.get('group') ||
      searchParams.get('dist') ||
      searchParams.get('history')
    const rawTarget = searchParams.get('target')
    const normalized = normalizeSkyTargetId(rawTarget)
    const targetMismatch = rawTarget && rawTarget !== normalized
    if (!hasSolarNoise && !targetMismatch && searchParams.get('view') === 'sky') return
    router.replace(
      mergeExplorePreservedParams(
        buildExploreHref({ view: 'sky', targetId: skyActiveTargetId }),
        searchParams,
      ),
      { scroll: false },
    )
  }, [exploreView, pathname, router, searchParams, skyActiveTargetId])

  const sceneMode: ExploreSceneMode =
    exploreView === 'sky'
      ? 'showcase'
      : earthHistoryOpen
        ? 'earth'
        : planetHistoryOpen
          ? 'planet-history'
          : 'showcase'

  const activeTargetId = exploreView === 'sky' ? skyActiveTargetId : showcaseActiveItemId

  const openPlanetHistory = useCallback(
    (entityId: string, focus?: { beatId?: number; pinId?: string }) => {
      const id = String(entityId || '').trim()
      if (!id) return
      setEarthHistoryOpen(false)
      setPlanetHistoryPendingId(id)
      setShowcaseActiveItemId(id)
      const next = new URLSearchParams(searchParams.toString())
      next.set('view', 'solar')
      next.set('entity', id)
      next.set('history', '1')
      next.delete('stage')
      next.delete('target')
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
    setPlanetHistoryPendingId(null)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('history')
    next.delete('beat')
    next.delete('pin')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const setPlanetHistoryOpen = useCallback(
    (open: boolean) => {
      if (!open) closePlanetHistory()
    },
    [closePlanetHistory],
  )

  return {
    pathname,
    router,
    searchParams,
    exploreView,
    activeTargetId,
    stageTime,
    bridgeDebugOn,
    earthHistoryOpen,
    setEarthHistoryOpen,
    planetHistoryOpen,
    setPlanetHistoryOpen,
    planetHistoryEntityId,
    showcaseMenuOpen,
    setShowcaseMenuOpen,
    showcaseActiveItemId,
    setShowcaseActiveItemId,
    skyActiveTargetId,
    setSkyActiveTargetId,
    skySceneHighlightId,
    setSkySceneHighlightId,
    selectedSolarPlanetIndex,
    setSelectedSolarPlanetIndex,
    sceneMode,
    openPlanetHistory,
    closePlanetHistory,
  }
}
