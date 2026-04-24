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
        const x = Math.cos(nextA) * entity.distance
        const z = Math.sin(nextA) * entity.distance
        const y = Math.sin(nextA * 0.5) * entity.distance * 0.08
        g.position.set(p.x + x, p.y + y, p.z + z)
      } else if (entity.parentShowcaseEntityId) {
        const parentG = groupsRef.current.get(entity.parentShowcaseEntityId)
        if (!parentG) continue
        const p = parentG.position
        const x = Math.cos(nextA) * entity.distance
        const z = Math.sin(nextA) * entity.distance
        const y = Math.sin(nextA * 0.5) * entity.distance * 0.08
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
  const proximityFade: OrbitProximityFade = {
    getWorldPosition: () => {
      const g = groupsRef.current.get(entity.id)
      if (!g) return null
      return g.getWorldPosition(scratch.current)
    },
    near: 0.95,
    far: 3.8,
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
          for (let i = 0; i <= 48; i++) {
            const t = (i / 48) * Math.PI * 2
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
          near: 2.0,
          far: 8.2,
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
        <Html distanceFactor={12}>
          <div
            className="select-none whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
            style={{
              color: active ? '#d9f5ff' : '#b6c8d8',
              background: active ? 'rgba(34,211,238,0.24)' : 'rgba(0,0,0,0.35)',
              border: active ? '1px solid rgba(34,211,238,0.55)' : '1px solid rgba(255,255,255,0.12)',
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
            {entity.name}
          </div>
        </Html>
      </group>
    </group>
  )
}
