'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  fetchSkyExploreTargets,
  getBundledSkyExploreTargets,
  type SkyExploreTarget,
} from '@/features/explore/public'
import { loadWesternExploreTargets } from '@/features/explore/lib/westernSkyCulture'
import {
  fetchHipCatalogIndex,
  getHipCatalogIndexSync,
  preloadHipCatalogIndex,
  type HipCatalogEntry,
} from '@/features/explore/lib/hipBrightCatalogCache'

function mergeSkyTargets(
  base: SkyExploreTarget[],
  western: SkyExploreTarget[],
): SkyExploreTarget[] {
  const bodies = base.filter((t) => t.kind === 'body')
  const constellations =
    western.length > 0
      ? western
      : base.filter((t) => t.kind === 'constellation')
  return [...constellations, ...bodies]
}

export function useExploreSkyCatalog(skyActiveTargetId: string) {
  const [baseTargets, setBaseTargets] = useState<SkyExploreTarget[]>(
    () => getBundledSkyExploreTargets().targets,
  )
  const [westernTargets, setWesternTargets] = useState<SkyExploreTarget[]>([])
  const [dataSource, setDataSource] = useState<'api' | 'bundled' | 'loading'>('loading')
  const [cultureReady, setCultureReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchSkyExploreTargets().then((data) => {
      if (cancelled) return
      setBaseTargets(data.targets)
      setDataSource(data.source === 'api' ? 'api' : 'bundled')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    preloadHipCatalogIndex()
    const sync = getHipCatalogIndexSync()
    const load = (map: Map<number, HipCatalogEntry> | null) => {
      if (cancelled || !map?.size) return
      void loadWesternExploreTargets(map).then((targets) => {
        if (cancelled) return
        setWesternTargets(targets)
        setCultureReady(true)
      })
    }
    if (sync?.size) load(sync)
    else void fetchHipCatalogIndex().then(load)
    return () => {
      cancelled = true
    }
  }, [])

  const skyTargets = useMemo(
    () => mergeSkyTargets(baseTargets, westernTargets),
    [baseTargets, westernTargets],
  )

  const activeSkyTarget = useMemo(
    () => skyTargets.find((t) => t.id === skyActiveTargetId) ?? null,
    [skyTargets, skyActiveTargetId],
  )

  const constellationTargets = useMemo(
    () => skyTargets.filter((t) => t.kind === 'constellation'),
    [skyTargets],
  )

  const bodyTargets = useMemo(() => skyTargets.filter((t) => t.kind === 'body'), [skyTargets])

  return {
    skyTargets,
    activeSkyTarget,
    constellationTargets,
    bodyTargets,
    skyDataSource: dataSource,
    westernCultureReady: cultureReady,
  }
}
