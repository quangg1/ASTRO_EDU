'use client'

import { useEffect, useMemo, useState } from 'react'
import { getNasaCatalogItemById, NASA_SHOWCASE_ITEMS, SHOWCASE_ORBIT_ENTITIES } from '@/lib/showcaseEntities'
import {
  buildPlanetGlobeEntity,
  mergeNasaCatalog,
  mergeOrbitEntities,
  mergeOrbitalElementsPreferUsable,
} from '@/lib/mergeShowcaseCatalog'
import {
  fetchPublicShowcaseEntityContents,
  fetchJplShowcaseOrbits,
  type ShowcaseEntityContentDTO,
  type ShowcaseJplOrbitDTO,
} from '@/features/content3d/showcase/public'
import { SHOWCASE_CATALOG_CHANGED_EVENT } from '@/lib/showcaseCatalogRefresh'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'

export function useExploreShowcaseCatalog(planetHistoryEntityId: string | null) {
  const showcaseCatalogGen = useShowcaseCatalogGen()
  const [showcaseContent, setShowcaseContent] = useState<ShowcaseEntityContentDTO[]>([])
  const [jplOrbits, setJplOrbits] = useState<ShowcaseJplOrbitDTO[]>([])

  useEffect(() => {
    let cancelled = false
    const debounceRef = { current: null as ReturnType<typeof setTimeout> | null }

    const load = () => {
      fetchPublicShowcaseEntityContents().then((rows) => {
        if (!cancelled) setShowcaseContent(rows)
      })
    }

    load()

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        load()
      }, 350)
    }

    window.addEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      window.removeEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchJplShowcaseOrbits().then((items) => {
      if (!cancelled) setJplOrbits(items)
    })
    return () => {
      cancelled = true
    }
  }, [showcaseCatalogGen])

  const resolvedCatalog = useMemo(
    () => mergeNasaCatalog(NASA_SHOWCASE_ITEMS, showcaseContent),
    [showcaseContent, showcaseCatalogGen],
  )

  const mergedOrbitEntities = useMemo(() => {
    const merged = mergeOrbitEntities(SHOWCASE_ORBIT_ENTITIES, showcaseContent)
    if (!jplOrbits.length) return merged
    const byId = new Map(jplOrbits.map((o) => [o.id, o] as const))
    return merged.map((e) => {
      const j = byId.get(e.id)
      if (!j) return e
      return {
        ...e,
        horizonsId: j.horizonsId || e.horizonsId,
        orbitAround: j.orbitAround || e.orbitAround,
        parentId: j.parentId || e.parentId,
        radiusKm: (j.radiusKm && j.radiusKm > 0 ? j.radiusKm : e.radiusKm) || e.radiusKm,
        massKg: j.massKg || e.massKg,
        rotRateRadS: j.rotRateRadS || e.rotRateRadS,
        vectorAu: j.vectorAu || e.vectorAu,
        vectorSim: j.vectorSim || e.vectorSim,
        orbitalElements: mergeOrbitalElementsPreferUsable(j, e),
        orbitEccentricity: j.orbitEccentricity,
        inclinationDeg: j.inclinationDeg,
        ascendingNodeDeg: j.ascendingNodeDeg,
        phaseDeg: j.phaseDeg,
        period: j.period,
        periodDays: j.periodDays ?? undefined,
        semiMajorAxisAu: j.semiMajorAxisAu ?? undefined,
        orbitSource: 'jpl-horizons' as const,
      }
    })
  }, [showcaseContent, showcaseCatalogGen, jplOrbits])

  const planetGlobeEntity = useMemo(() => {
    if (!planetHistoryEntityId) return null
    return buildPlanetGlobeEntity(planetHistoryEntityId, mergedOrbitEntities, showcaseContent)
  }, [planetHistoryEntityId, mergedOrbitEntities, showcaseContent])

  const planetHistoryLabel = useMemo(() => {
    if (!planetHistoryEntityId) return 'Deep History'
    const cat = getNasaCatalogItemById(planetHistoryEntityId)
    return cat?.name || planetHistoryEntityId
  }, [planetHistoryEntityId, showcaseCatalogGen])

  return {
    showcaseContent,
    jplOrbits,
    resolvedCatalog,
    mergedOrbitEntities,
    planetGlobeEntity,
    planetHistoryLabel,
  }
}
