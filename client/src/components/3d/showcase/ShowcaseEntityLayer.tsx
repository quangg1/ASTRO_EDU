'use client'

import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetData } from '@/lib/solarSystemData'
import { planetsData } from '@/lib/solarSystemData'
import { computeOrbitalPosition } from '@/lib/solarOrbitMath'
import { getNasaCatalogItemById, SHOWCASE_ORBIT_ENTITIES, type ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { OrbitPath } from '@/components/3d/OrbitPath'
import { ShowcaseEntityMesh } from '@/components/3d/showcase/ShowcaseEntityMesh'
import { useShowcaseStore } from '@/store/showcaseStore'
import { useLineProximityFade, type OrbitProximityFade } from '@/components/3d/orbitProximityFade'

export function ShowcaseEntityLayer({
  planetPositionsRef,
  activeItemId,
  visible,
  frozen = false,
  activeGroup,
  onPositionUpdate,
  onSelectEntity,
  selectedPlanetName,
}: {
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  activeItemId?: string | null
  visible: boolean
  frozen?: boolean
  activeGroup: string
  onPositionUpdate?: (id: string, position: THREE.Vector3) => void
  onSelectEntity?: (id: string) => void
  selectedPlanetName?: string | null
}) {
  const preloadGroup = useShowcaseStore((s) => s.preloadGroup)
  const parentIndexByName = useMemo(
    () => new Map(planetsData.map((p, idx) => [p.name, idx] as const)),
    [],
  )
  const groupsRef = useRef(new Map<string, THREE.Group>())
  const anglesRef = useRef(
    new Map<string, number>(
      SHOWCASE_ORBIT_ENTITIES.map((e) => [e.id, THREE.MathUtils.degToRad(e.phaseDeg ?? Math.random() * 360)]),
    ),
  )

  useFrame((_, dt) => {
    if (!visible) return
    for (const entity of SHOWCASE_ORBIT_ENTITIES) {
      const g = groupsRef.current.get(entity.id)
      if (!g) continue
      const prevA = anglesRef.current.get(entity.id) ?? 0
      const nextA = frozen ? prevA : prevA + dt * ((Math.PI * 2) / entity.period)
      anglesRef.current.set(entity.id, nextA)

      if (entity.parentPlanetName) {
        const pIdx = parentIndexByName.get(entity.parentPlanetName)
        if (pIdx == null) continue
        const p = planetPositionsRef.current[pIdx]
        if (!p || p.lengthSq() < 1e-6) continue
        const parentRadius = planetsData[pIdx]?.radius ?? 0.6
        // Keep moon/entity orbit outside parent sphere for readable, NASA-Eyes-like composition.
        const orbitRadius = Math.max(entity.distance, parentRadius * 1.55 + entity.distance * 0.65)
        const x = Math.cos(nextA) * orbitRadius
        const z = Math.sin(nextA) * orbitRadius
        const y = Math.sin(nextA * 0.5) * orbitRadius * 0.06
        g.position.set(p.x + x, p.y + y, p.z + z)
      } else if (entity.parentShowcaseEntityId) {
        const parentG = groupsRef.current.get(entity.parentShowcaseEntityId)
        if (!parentG) continue
        const p = parentG.position
        const orbitRadius = Math.max(entity.distance, entity.distance * 1.45)
        const x = Math.cos(nextA) * orbitRadius
        const z = Math.sin(nextA) * orbitRadius
        const y = Math.sin(nextA * 0.5) * orbitRadius * 0.06
        g.position.set(p.x + x, p.y + y, p.z + z)
      } else {
        const pseudo = {
          distance: entity.distance,
          orbitEccentricity: 0.05,
          orbitInclinationDeg: entity.inclinationDeg ?? 0,
          orbitAscendingNodeDeg: entity.ascendingNodeDeg ?? 0,
        } as PlanetData
        const pos = computeOrbitalPosition(pseudo, nextA)
        g.position.copy(pos)
      }
      onPositionUpdate?.(entity.id, g.position)
    }
  })

  const visibleEntities = useMemo(() => {
    return SHOWCASE_ORBIT_ENTITIES.filter((entity) => {
      const c = getNasaCatalogItemById(entity.id)
      const g = c?.group
      const groupOk =
        g === activeGroup || (!!preloadGroup && g === preloadGroup) || entity.id === activeItemId
      if (!groupOk) return false
      if (!selectedPlanetName) return true
      if (entity.id === activeItemId) return true
      if (entity.parentPlanetName) return entity.parentPlanetName === selectedPlanetName
      if (entity.parentShowcaseEntityId) return false
      return false
    })
  }, [activeGroup, preloadGroup, activeItemId, selectedPlanetName])

  if (!visible) return null

  return (
    <group>
      {visibleEntities.map((entity) => (
        <Suspense key={entity.id} fallback={null}>
          <ShowcaseEntityRow
            entity={entity}
            activeItemId={activeItemId}
            selectedPlanetName={selectedPlanetName ?? null}
            parentIndexByName={parentIndexByName}
            planetPositionsRef={planetPositionsRef}
            groupsRef={groupsRef}
            onSelectEntity={onSelectEntity}
          />
        </Suspense>
      ))}
    </group>
  )
}

/** Local moon / Charon path; opacity fades as the camera nears the orbiting mesh (NASA Eyes). */
function FadedLocalEllipticOrbit({
  entity,
  getAnchor,
  groupsRef,
  baseOpacity,
}: {
  entity: ShowcaseOrbitEntity
  getAnchor: () => THREE.Vector3 | null
  groupsRef: React.MutableRefObject<Map<string, THREE.Group>>
  baseOpacity: number
}) {
  const matRef = useRef<THREE.LineBasicMaterial>(null)
  const scratch = useRef(new THREE.Vector3())
  const anchorScratch = useRef(new THREE.Vector3())
  const near = Math.max(0.7, entity.distance * 1.05)
  const far = Math.max(2.4, entity.distance * 3)
  const proximityFade: OrbitProximityFade = {
    getWorldPosition: () => getAnchor()?.clone() ?? null,
    getCameraDistance: (camera) => {
      const anchor = getAnchor()
      if (!anchor) return null
      anchorScratch.current.copy(anchor)
      return camera.position.distanceTo(anchorScratch.current)
    },
    near,
    far,
  }
  useLineProximityFade(matRef, proximityFade, () => baseOpacity)
  return (
    <lineLoop raycast={() => null}>
      <bufferGeometry
        attach="geometry"
        onUpdate={(geom) => {
          const c = getAnchor()
          if (!c) return
          const pts: THREE.Vector3[] = []
          const segs = Math.max(72, Math.min(240, Math.round(entity.distance * 60)))
          for (let i = 0; i <= segs; i++) {
            const t = (i / segs) * Math.PI * 2
            pts.push(
              new THREE.Vector3(
                c.x + Math.cos(t) * entity.distance,
                c.y + Math.sin(t * 0.5) * entity.distance * 0.08,
                c.z + Math.sin(t) * entity.distance,
              ),
            )
          }
          geom.setFromPoints(pts)
        }}
      />
      <lineBasicMaterial ref={matRef} color={entity.orbitColor} transparent opacity={baseOpacity} depthWrite={false} />
    </lineLoop>
  )
}

function ShowcaseEntityRow({
  entity,
  activeItemId,
  selectedPlanetName,
  parentIndexByName,
  planetPositionsRef,
  groupsRef,
  onSelectEntity,
}: {
  entity: ShowcaseOrbitEntity
  activeItemId?: string | null
  selectedPlanetName: string | null
  parentIndexByName: Map<string, number>
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  groupsRef: React.MutableRefObject<Map<string, THREE.Group>>
  onSelectEntity?: (id: string) => void
}) {
  const bodyWorldScratch = useRef(new THREE.Vector3())
  const active = activeItemId === entity.id
  const parentIndex = entity.parentPlanetName ? parentIndexByName.get(entity.parentPlanetName) : undefined
  const parentPos = parentIndex != null ? planetPositionsRef.current[parentIndex] : null
  const showcaseParentPos =
    entity.parentShowcaseEntityId != null
      ? groupsRef.current.get(entity.parentShowcaseEntityId)?.position
      : null
  const showSatelliteOrbit =
    Boolean(parentPos) &&
    Boolean(selectedPlanetName) &&
    entity.parentPlanetName === selectedPlanetName &&
    activeItemId === entity.id
  const showCharonOrbit =
    Boolean(showcaseParentPos) && entity.parentShowcaseEntityId != null && activeItemId === entity.id

  const heliocentricProximityFade: OrbitProximityFade | undefined =
    !entity.parentPlanetName && activeItemId === entity.id
      ? {
          getWorldPosition: () => {
            const g = groupsRef.current.get(entity.id)
            if (!g) return null
            return g.getWorldPosition(bodyWorldScratch.current)
          },
          near: Math.max(2.0, entity.distance * 0.7),
          far: Math.max(6.5, entity.distance * 3),
        }
      : undefined

  return (
    <group>
      {!entity.parentPlanetName ? (
            <OrbitPath
              data={{
                name: entity.name,
                nameVi: entity.name,
                explorerBlurb: '',
                texture: '',
                radius: 0.01,
                distance: entity.distance,
                period: entity.period,
                spinPeriod: entity.period,
                orbitColor: entity.orbitColor,
                orbitEccentricity: 0.05,
                orbitInclinationDeg: entity.inclinationDeg ?? 0,
                orbitAscendingNodeDeg: entity.ascendingNodeDeg ?? 0,
              }}
              highlighted={active}
              visible={!activeItemId || activeItemId === entity.id}
              interactive={false}
              proximityFade={heliocentricProximityFade}
            />
      ) : parentPos && showSatelliteOrbit ? (
        <FadedLocalEllipticOrbit
          entity={entity}
          getAnchor={() => parentPos}
          groupsRef={groupsRef}
          baseOpacity={active ? 0.95 : 0.35}
        />
      ) : showcaseParentPos && showCharonOrbit ? (
        <FadedLocalEllipticOrbit
          entity={entity}
          getAnchor={() => showcaseParentPos ?? null}
          groupsRef={groupsRef}
          baseOpacity={active ? 0.95 : 0.35}
        />
      ) : null}
      <group
        ref={(node) => {
          if (!node) groupsRef.current.delete(entity.id)
          else groupsRef.current.set(entity.id, node)
        }}
      >
        <ShowcaseEntityMesh
          entity={entity}
          active={active}
          onSelect={() => onSelectEntity?.(entity.id)}
        />
        <Html distanceFactor={9.2} occlude>
          <div
            className="select-none whitespace-nowrap px-1 py-0.5 text-[9px] uppercase tracking-wide inline-flex items-center gap-1"
            style={{
              color: active ? '#c9f4ff' : 'rgba(225,234,245,0.86)',
              background: active ? 'rgba(18, 24, 32, 0.38)' : 'transparent',
              border: 'none',
              borderRadius: active ? 5 : 0,
              opacity: active ? 1 : activeItemId ? 0.56 : 0.88,
              textShadow: '0 0 6px rgba(0,0,0,0.65)',
            }}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelectEntity?.(entity.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onSelectEntity?.(entity.id)
              }
            }}
          >
            <span
              aria-hidden
              style={{
                width: active ? 8 : 6,
                height: active ? 8 : 6,
                borderRadius: 1,
                display: 'inline-block',
                background: active ? '#66e3ff' : 'rgba(240,244,252,0.82)',
                boxShadow: active ? '0 0 6px rgba(102,227,255,0.5)' : 'none',
                opacity: active ? 1 : 0.78,
              }}
            />
            {entity.name}
          </div>
        </Html>
      </group>
    </group>
  )
}
