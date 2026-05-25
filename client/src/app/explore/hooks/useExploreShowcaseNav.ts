'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { planetsData } from '@/lib/solarSystemData'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { resolvePlanetAccent } from '@/features/content3d/showcase/public'
import { trackLearningPathBehavior } from '@/features/learning-path/public'
import type { ShowcaseCameraSpherical } from '@/components/3d/showcase/ShowcaseCameraManager'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ReadonlyURLSearchParams } from 'next/navigation'

type NavArgs = {
  pathname: string
  router: { replace: (url: string, opts?: { scroll?: boolean }) => void }
  searchParams: ReadonlyURLSearchParams
  showcaseActiveItemId: string
  setShowcaseActiveItemId: (id: string) => void
  selectedSolarPlanetIndex: number | null
  setSelectedSolarPlanetIndex: (idx: number | null) => void
  activeResolved: ResolvedNasaCatalogItem | null
  planetHistoryOpen: boolean
  planetBeatAccent: string
  pushBridgeDebug: (msg: string) => void
}

export function useExploreShowcaseNav({
  pathname,
  router,
  searchParams,
  showcaseActiveItemId,
  setShowcaseActiveItemId,
  selectedSolarPlanetIndex,
  setSelectedSolarPlanetIndex,
  activeResolved,
  planetHistoryOpen,
  planetBeatAccent,
  pushBridgeDebug,
}: NavArgs) {
  const showcaseCameraUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCameraQueryRef = useRef('')

  const distQ = searchParams.get('dist')
  const azQ = searchParams.get('az')
  const elQ = searchParams.get('el')

  const initialShowcaseSpherical = useMemo((): ShowcaseCameraSpherical | null => {
    if (distQ == null || azQ == null || elQ == null) return null
    const distance = parseFloat(distQ)
    const az = parseFloat(azQ)
    const el = parseFloat(elQ)
    if (!Number.isFinite(distance) || !Number.isFinite(az) || !Number.isFinite(el)) return null
    return { distance, az, el }
  }, [distQ, azQ, elQ])

  const planetAccent = useMemo(() => {
    if (planetHistoryOpen) return planetBeatAccent
    const focusedPlanet =
      selectedSolarPlanetIndex != null ? planetsData[selectedSolarPlanetIndex]?.name : null
    return resolvePlanetAccent(focusedPlanet ?? activeResolved?.linkedPlanetName ?? null)
  }, [planetHistoryOpen, planetBeatAccent, selectedSolarPlanetIndex, activeResolved?.linkedPlanetName])

  const syncSelectedPlanetFromItem = useCallback((entityId: string) => {
    const item = NASA_SHOWCASE_ITEMS.find((x) => x.id === entityId)
    const planetName = item?.linkedPlanetName
    if (!planetName) return
    const idx = planetsData.findIndex((p) => p.name === planetName)
    if (idx >= 0) setSelectedSolarPlanetIndex(idx)
  }, [setSelectedSolarPlanetIndex])

  const handleShowcaseEntityClicked = useCallback(
    (entityId: string, source: string) => {
      setShowcaseActiveItemId(entityId)
      trackLearningPathBehavior({
        eventName: 'scene_entity_clicked',
        metadata: { schemaVersion: 'scene_event_v2', entityId, source },
      })
      pushBridgeDebug(`click ${entityId} (${source})`)
    },
    [setShowcaseActiveItemId, pushBridgeDebug],
  )

  const handleShowcaseCameraSettled = useCallback(
    (sph: ShowcaseCameraSpherical) => {
      if (showcaseCameraUrlTimerRef.current) clearTimeout(showcaseCameraUrlTimerRef.current)
      showcaseCameraUrlTimerRef.current = setTimeout(() => {
        showcaseCameraUrlTimerRef.current = null
        if (typeof window === 'undefined') return
        const next = new URLSearchParams(window.location.search)
        const dist = sph.distance.toFixed(2)
        const az = sph.az.toFixed(1)
        const el = sph.el.toFixed(1)
        if (next.get('dist') === dist && next.get('az') === az && next.get('el') === el) {
          return
        }
        next.set('dist', dist)
        next.set('az', az)
        next.set('el', el)
        const updated = next.toString()
        if (updated === lastCameraQueryRef.current) return
        lastCameraQueryRef.current = updated
        window.history.replaceState(null, '', `${pathname}?${updated}`)
      }, 280)
    },
    [pathname],
  )

  useEffect(() => {
    const entityParam = searchParams.get('entity') || ''
    if (!entityParam) return
    const exists = NASA_SHOWCASE_ITEMS.some((item) => item.id === entityParam)
    if (exists) setShowcaseActiveItemId(entityParam)
  }, [searchParams, setShowcaseActiveItemId])

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('mode', 'showcase')
    if (showcaseActiveItemId) {
      next.set('entity', showcaseActiveItemId)
      const item = NASA_SHOWCASE_ITEMS.find((x) => x.id === showcaseActiveItemId)
      if (item?.group) next.set('group', item.group)
      if (item?.linkedPlanetName) next.set('target', item.linkedPlanetName.toLowerCase())
    }
    const updated = next.toString()
    if (updated === searchParams.toString()) return
    router.replace(`${pathname}?${updated}`, { scroll: false })
  }, [pathname, router, searchParams, showcaseActiveItemId])

  return {
    initialShowcaseSpherical,
    planetAccent,
    syncSelectedPlanetFromItem,
    handleShowcaseEntityClicked,
    handleShowcaseCameraSettled,
  }
}
