'use client'

import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Billboard, Html } from '@react-three/drei'
import { useRef, useMemo, useLayoutEffect, useState } from 'react'
import * as THREE from 'three'
import { applyGlobeTextureQuality } from '@/lib/planetTextureQuality'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { sunData, type PlanetData } from '@/lib/solarSystemData'
import { computeOrbitalPosition } from '@/lib/solarOrbitMath'
import { useShowcaseStore } from '@/store/showcaseStore'

export const SUN_SPIN_PERIOD = 25

/** Explore: từ khoảng cách này trở lên, hiện chấm/vòng 2D thay vì cầu texture (style NASA Eyes). */
const EXPLORE_LOD_TEXTURE_DISTANCE = 16
const EXPLORE_ICON_ANGULAR_SCALE = 0.024
const EXPLORE_ICON_SCALE_MIN = 0.4
const EXPLORE_ICON_SCALE_MAX = 2.6

function labelFadeFromCameraZoom(sunDist: number, isSelected: boolean): number {
  if (isSelected) return 1
  if (!Number.isFinite(sunDist) || sunDist < 2) return 1
  if (sunDist < 48) return 1
  if (sunDist > 220) return 0.38
  return THREE.MathUtils.clamp(1 - (sunDist - 48) / 165, 0.38, 1)
}

export function useMeshRaycastEnabled(meshRef: React.RefObject<THREE.Mesh | null>, enabled: boolean) {
  const saved = useRef<THREE.Mesh['raycast'] | null>(null)
  useLayoutEffect(() => {
    let raf = 0
    let tries = 0
    const apply = () => {
      const m = meshRef.current
      if (!m && tries++ < 90) {
        raf = requestAnimationFrame(apply)
        return
      }
      if (!m) return
      if (!saved.current) saved.current = m.raycast
      m.raycast = enabled ? saved.current : () => {}
    }
    apply()
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [enabled, meshRef])
}

type PlanetRenderProfile = {
  roughness: number
  metalness: number
  bumpScale: number
  atmosphereColor: string | null
  atmosphereScale: number
  atmosphereOpacity: number
}

export function getPlanetRenderProfile(name: string): PlanetRenderProfile {
  switch (name) {
    case 'Mercury':
      return {
        roughness: 0.9,
        metalness: 0.03,
        bumpScale: 0.2,
        atmosphereColor: null,
        atmosphereScale: 1.02,
        atmosphereOpacity: 0,
      }
    case 'Venus':
      return {
        roughness: 0.78,
        metalness: 0.03,
        bumpScale: 0.12,
        atmosphereColor: '#ffcc88',
        atmosphereScale: 1.045,
        atmosphereOpacity: 0.17,
      }
    case 'Earth':
      return {
        roughness: 0.7,
        metalness: 0.05,
        bumpScale: 0.1,
        atmosphereColor: '#66ccff',
        atmosphereScale: 1.05,
        atmosphereOpacity: 0.2,
      }
    case 'Mars':
      return {
        roughness: 0.82,
        metalness: 0.03,
        bumpScale: 0.16,
        atmosphereColor: '#f7a07b',
        atmosphereScale: 1.035,
        atmosphereOpacity: 0.08,
      }
    default:
      return {
        roughness: 0.76,
        metalness: 0.04,
        bumpScale: 0.11,
        atmosphereColor: '#9cc9ff',
        atmosphereScale: 1.03,
        atmosphereOpacity: 0.06,
      }
  }
}

export function PlanetLabel({
  name,
  radius,
  visible = true,
  interactive = true,
  compact = false,
  distanceFactor,
  opacity = 1,
  position: labelPosition,
  /** HUD kiểu NASA Eyes — chữ HOA, viền, tương phản cao. */
  nasaHud = false,
  onSelect,
}: {
  name: string
  radius: number
  visible?: boolean
  interactive?: boolean
  compact?: boolean
  /** Mặc định: compact 5.5, full 20. */
  distanceFactor?: number
  opacity?: number
  /** Vị tré local; mặc định cạnh tâm cầu. */
  position?: [number, number, number]
  nasaHud?: boolean
  onSelect?: () => void
}) {
  if (!visible) return null
  const df =
    distanceFactor ??
    (nasaHud ? (compact ? 11 : 16) : compact ? 5.5 : 20)
  const pos: [number, number, number] = labelPosition ?? [radius * 1.55, radius * 0.14, 0]
  const display = nasaHud ? name.toUpperCase() : name
  const defaultCls = compact
    ? 'select-none whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white'
    : 'select-none whitespace-nowrap rounded-md px-2 py-1 text-[34px] font-extrabold uppercase tracking-[0.14em] text-white'
  const nasaCls = compact
    ? 'select-none whitespace-nowrap rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/95'
    : 'select-none whitespace-nowrap rounded-sm px-3 py-1.5 text-[17px] font-bold uppercase tracking-[0.2em] text-white/95'
  return (
    <Html distanceFactor={df} position={pos} style={{ opacity, pointerEvents: interactive ? 'auto' : 'none' }}>
      <div
        className={nasaHud ? nasaCls : defaultCls}
        style={{
          opacity: 1,
          textShadow: nasaHud
            ? '0 0 14px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.85)'
            : compact
              ? '0 0 6px rgba(0,0,0,0.65)'
              : '0 0 14px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.25)',
          WebkitTextStroke: nasaHud ? '0.45px rgba(0,0,0,0.55)' : compact ? '0.35px rgba(0,0,0,0.5)' : '0.8px rgba(0,0,0,0.45)',
          background: nasaHud
            ? 'linear-gradient(180deg, rgba(14,18,28,0.94) 0%, rgba(8,10,18,0.9) 100%)'
            : compact
              ? 'rgba(0,0,0,0.45)'
              : 'rgba(0,0,0,0.12)',
          border: nasaHud ? '1px solid rgba(255,255,255,0.22)' : undefined,
          boxShadow: nasaHud ? '0 2px 14px rgba(0,0,0,0.55)' : undefined,
        }}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={
          interactive
            ? (e) => {
                e.stopPropagation()
                onSelect?.()
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect?.()
                }
              }
            : undefined
        }
        onPointerEnter={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
        onPointerLeave={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
      >
        {display}
      </div>
    </Html>
  )
}

export function Sun({
  onSelect,
  interactive = true,
  spinTimeScale = 1,
  visible = true,
  radiusScale = 1,
}: {
  onSelect: () => void
  interactive?: boolean
  spinTimeScale?: number
  visible?: boolean
  radiusScale?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const meshGlowRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(meshRef, interactive)
  useMeshRaycastEnabled(meshGlowRef, interactive)
  const { gl } = useThree()
  const texture = useLoader(THREE.TextureLoader, getStaticAssetUrl(sunData.texture)) as THREE.Texture
  useLayoutEffect(() => {
    applyGlobeTextureQuality(texture, gl, { wrap: 'repeat' })
  }, [texture, gl])
  useFrame((_, delta) => {
    if (groupRef.current) {
      const spinSpeed = (spinTimeScale * (2 * Math.PI)) / SUN_SPIN_PERIOD
      groupRef.current.rotation.y += delta * spinSpeed
    }
  })
  return (
    <group
      ref={groupRef}
      visible={visible}
      onClick={interactive ? (e) => { e.stopPropagation(); onSelect() } : undefined}
    >
      <mesh ref={meshGlowRef}>
        <sphereGeometry args={[sunData.radius * radiusScale * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#ffeedd"
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[sunData.radius * radiusScale, 64, 64]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  )
}

function PlanetRing({
  inner,
  outer,
  texturePath,
  interactive = true,
}: {
  inner: number
  outer: number
  texturePath: string
  interactive?: boolean
}) {
  const ringMeshRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(ringMeshRef, interactive)
  const { gl } = useThree()
  const ringTex = useLoader(THREE.TextureLoader, texturePath) as THREE.Texture
  useLayoutEffect(() => {
    applyGlobeTextureQuality(ringTex, gl)
  }, [ringTex, gl])
  return (
    <mesh ref={ringMeshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 64]} />
      <meshBasicMaterial
        map={ringTex}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function Planet({
  data,
  index,
  positionRef,
  onSelect,
  onPlanetSelect,
  interactive = true,
  orbitTimeScale = 1,
  spinTimeScale = 1,
  visible = true,
  unlitTexture = false,
  orbitScale = 1,
  bodyScale = 1,
  showLabel = false,
  compactPlanetLabel = false,
  /** Khi bật: xa camera hiện chấm/vòng, gần mới thấy texture (Explore / showcase). */
  exploreStyleLod = false,
  /** Hành tinh đang chọn: luôn ưu tiên texture + nhãn rõ. */
  isSelected = false,
  onHoverChange,
}: {
  data: PlanetData
  index: number
  positionRef: React.MutableRefObject<THREE.Vector3[]>
  onSelect: () => void
  onPlanetSelect?: (index: number | null) => void
  interactive?: boolean
  orbitTimeScale?: number
  spinTimeScale?: number
  visible?: boolean
  unlitTexture?: boolean
  orbitScale?: number
  bodyScale?: number
  showLabel?: boolean
  compactPlanetLabel?: boolean
  exploreStyleLod?: boolean
  isSelected?: boolean
  onHoverChange?: (hovered: boolean) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const fullGroupRef = useRef<THREE.Group>(null)
  const iconGroupRef = useRef<THREE.Group>(null)
  const iconScaleRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const bodyMeshRef = useRef<THREE.Mesh>(null)
  const iconHitRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(bodyMeshRef, interactive)
  useMeshRaycastEnabled(iconHitRef, interactive)
  const ringMeshRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(ringMeshRef, interactive)
  const { gl, camera } = useThree()
  const [iconMode, setIconMode] = useState(false)
  const [labelOpacity, setLabelOpacity] = useState(1)
  const iconModeSyncRef = useRef(false)
  const lastLabelOpRef = useRef(1)
  const lastWorldPos = useRef(new THREE.Vector3())
  const handlePlanetPick = useMemo(
    () => () => {
      onSelect()
      onPlanetSelect?.(index)
    },
    [onSelect, onPlanetSelect, index],
  )
  const phaseOffset = useMemo(
    () => THREE.MathUtils.degToRad(data.orbitPhaseDeg ?? 0),
    [data.orbitPhaseDeg]
  )
  const angleRef = useRef(Math.random() * Math.PI * 2 + phaseOffset)
  const map = useLoader(THREE.TextureLoader, getStaticAssetUrl(data.texture)) as THREE.Texture
  const profile = useMemo(() => getPlanetRenderProfile(data.name), [data.name])
  const orbitColor = data.orbitColor || '#94a3b8'
  const iconRingArgs = useMemo(() => {
    return [0.4, 0.58, 64] as [number, number, number]
  }, [])
  useLayoutEffect(() => {
    applyGlobeTextureQuality(map, gl)
  }, [map, gl])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const orbitSpeed = (orbitTimeScale * (2 * Math.PI)) / data.period
    angleRef.current += delta * orbitSpeed
    const a = angleRef.current
    const pos = computeOrbitalPosition(data, a, orbitScale)
    groupRef.current.position.copy(pos)
    if (positionRef.current[index]) positionRef.current[index].copy(groupRef.current.position)
    if (spinRef.current) {
      const spinSpeed = (spinTimeScale * (2 * Math.PI)) / data.spinPeriod
      spinRef.current.rotation.y += delta * spinSpeed
    }
    if (!exploreStyleLod) return

    lastWorldPos.current.setFromMatrixPosition(groupRef.current.matrixWorld)
    const dCam = camera.position.distanceTo(lastWorldPos.current)
    const useIcon = !isSelected && dCam > EXPLORE_LOD_TEXTURE_DISTANCE
    if (iconScaleRef.current) {
      const s = THREE.MathUtils.clamp(
        dCam * EXPLORE_ICON_ANGULAR_SCALE,
        EXPLORE_ICON_SCALE_MIN,
        EXPLORE_ICON_SCALE_MAX,
      )
      iconScaleRef.current.scale.setScalar(s)
    }
    if (fullGroupRef.current) fullGroupRef.current.visible = !useIcon
    if (iconGroupRef.current) iconGroupRef.current.visible = useIcon
    if (iconModeSyncRef.current !== useIcon) {
      iconModeSyncRef.current = useIcon
      setIconMode(useIcon)
    }
    const sunD = useShowcaseStore.getState().cameraDistanceToSun
    const op = labelFadeFromCameraZoom(sunD, isSelected)
    if (Math.abs(op - lastLabelOpRef.current) > 0.04) {
      lastLabelOpRef.current = op
      setLabelOpacity(op)
    }
  })

  return (
    <group ref={groupRef} visible={visible}>
      <group ref={fullGroupRef} visible>
        <group ref={spinRef}>
          <mesh
            ref={bodyMeshRef}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    handlePlanetPick()
                  }
                : undefined
            }
            onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
            onPointerEnter={interactive ? () => onHoverChange?.(true) : undefined}
            onPointerLeave={interactive ? () => onHoverChange?.(false) : undefined}
          >
            <sphereGeometry args={[data.radius * bodyScale, 96, 96]} />
            {unlitTexture ? (
              <meshBasicMaterial map={map} toneMapped={false} />
            ) : (
              <meshStandardMaterial
                map={map}
                bumpMap={map}
                bumpScale={profile.bumpScale}
                roughness={profile.roughness}
                metalness={profile.metalness}
                envMapIntensity={0.55}
              />
            )}
          </mesh>
          {!unlitTexture && profile.atmosphereColor && profile.atmosphereOpacity > 0 && (
            <mesh scale={[profile.atmosphereScale, profile.atmosphereScale, profile.atmosphereScale]}>
              <sphereGeometry args={[data.radius * bodyScale, 64, 64]} />
              <meshBasicMaterial
                color={profile.atmosphereColor}
                transparent
                opacity={profile.atmosphereOpacity}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}
          {data.ringTexture && (
            <PlanetRing
              inner={data.ringInner! * data.radius * bodyScale}
              outer={data.ringOuter! * data.radius * bodyScale}
              texturePath={getStaticAssetUrl(data.ringTexture)}
              interactive={interactive}
            />
          )}
        </group>
      </group>

      {exploreStyleLod && (
        <group ref={iconGroupRef} visible={false}>
          <group ref={iconScaleRef}>
            <Billboard>
              <mesh
                ref={ringMeshRef}
                onClick={
                  interactive
                    ? (e) => {
                        e.stopPropagation()
                        handlePlanetPick()
                      }
                    : undefined
                }
                onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                onPointerEnter={interactive ? () => onHoverChange?.(true) : undefined}
                onPointerLeave={interactive ? () => onHoverChange?.(false) : undefined}
              >
                <ringGeometry args={iconRingArgs} />
                <meshBasicMaterial
                  color={orbitColor}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.95}
                  depthWrite={false}
                />
              </mesh>
              <mesh
                ref={iconHitRef}
                renderOrder={1}
                onClick={
                  interactive
                    ? (e) => {
                        e.stopPropagation()
                        handlePlanetPick()
                      }
                    : undefined
                }
                onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                onPointerEnter={interactive ? () => onHoverChange?.(true) : undefined}
                onPointerLeave={interactive ? () => onHoverChange?.(false) : undefined}
              >
                <circleGeometry args={[1.0, 40]} />
                <meshBasicMaterial
                  color={orbitColor}
                  transparent
                  opacity={0.02}
                  depthWrite={false}
                />
              </mesh>
            </Billboard>
          </group>
        </group>
      )}

      {showLabel && (
        <PlanetLabel
          name={data.name}
          radius={data.radius * bodyScale}
          visible
          nasaHud={exploreStyleLod}
          compact={exploreStyleLod ? iconMode : compactPlanetLabel}
          distanceFactor={exploreStyleLod ? (iconMode ? 12 : 22) : undefined}
          opacity={labelOpacity}
          position={exploreStyleLod && iconMode ? [0.85, 0, 0] : undefined}
          interactive={interactive}
          onSelect={handlePlanetPick}
        />
      )}
    </group>
  )
}
