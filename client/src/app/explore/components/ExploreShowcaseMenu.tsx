'use client'

import { useShowcaseStore } from '@/features/content3d/showcase/public'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'

type Props = {
  open: boolean
  planetsMoons: ResolvedNasaCatalogItem[]
  dwarfPlanets: ResolvedNasaCatalogItem[]
  comets: ResolvedNasaCatalogItem[]
  spacecraft: ResolvedNasaCatalogItem[]
  onSelect: (entityId: string, source: string, syncPlanet?: boolean) => void
  onClose: () => void
}

export function ExploreShowcaseMenu({
  open,
  planetsMoons,
  dwarfPlanets,
  comets,
  spacecraft,
  onSelect,
  onClose,
}: Props) {
  if (!open) return null

  const menuBtn =
    'block w-full text-left rounded px-2 py-1.5 text-slate-200/80 bg-white/[0.02] hover:bg-white/10'

  return (
    <div className="fixed inset-0 z-[23] bg-black/45 backdrop-blur-[1px]">
      <div className="absolute left-1/2 top-[5.6rem] w-[min(1080px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#050a13]/96 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
          <div className="space-y-2 border-r border-white/10 pr-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Planets & Moons</p>
            {planetsMoons.map((item) => (
              <button
                key={`menu-planet-${item.id}`}
                type="button"
                onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                onClick={() => {
                  onSelect(item.id, 'menu-planets', true)
                  onClose()
                }}
                className="block w-full text-left rounded px-2 py-1.5 text-slate-200 hover:bg-white/10"
              >
                {item.displayName}
              </button>
            ))}
          </div>
          <div className="space-y-2 border-r border-white/10 pr-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Dwarf Planets & Asteroids</p>
            {dwarfPlanets.map((item) => (
              <button
                key={item.id}
                type="button"
                onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                onClick={() => {
                  onSelect(item.id, 'menu-dwarf')
                  onClose()
                }}
                className={menuBtn}
              >
                {item.displayName}
              </button>
            ))}
          </div>
          <div className="space-y-2 border-r border-white/10 pr-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Comets</p>
            {comets.map((item) => (
              <button
                key={item.id}
                type="button"
                onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                onClick={() => {
                  onSelect(item.id, 'menu-comets')
                  onClose()
                }}
                className={menuBtn}
              >
                {item.displayName}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Spacecraft</p>
            {spacecraft.map((item) => (
              <button
                key={item.id}
                type="button"
                onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(item.group)}
                onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
                onClick={() => {
                  onSelect(item.id, 'menu-spacecraft')
                  onClose()
                }}
                className={menuBtn}
              >
                {item.displayName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
