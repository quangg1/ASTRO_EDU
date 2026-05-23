'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import { getPhylumColor } from '@/lib/fossilPhyla'
import type { Fossil } from '@/types'

const EARTH_RADIUS = 5
/** Hơi nổi so với lưới (≈5.02) để chấm tách khỏi bề mặt và dễ pick hơn. */
const FOSSIL_ALTITUDE = 0.22

/**
 * Chấm chỉ hiện khi zoom đủ gần (khoảng cách camera ↔ orbit target).
 * Xa hơn → ẩn hoàn toàn và không pick — tránh “không thấy gì mà bấm vẫn trúng”.
 */
const FOSSIL_ZOOM_DIST_FULL = 13.2
const FOSSIL_ZOOM_DIST_HIDDEN = 21.5
/**
 * Kích thước chấm theo pixel màn hình — `sizeAttenuation={false}` để zoom sát
 * không làm chấm phình khổng lồ (đúng chỗ “hết đất zoom” trước đây).
 */
const FOSSIL_POINT_PX_MIN = 3.15
const FOSSIL_POINT_PX_MAX = 4.55

const ORBIT_FALLBACK_TARGET = new THREE.Vector3(0, 0, 0)

const _pickWorld = new THREE.Vector3()
const _pickAlong = new THREE.Vector3()
const _pickClosestOnRay = new THREE.Vector3()

/** Khoảng cách điểm → tia (đơn vị scene); siết để khớp chỗ bấm, không nuốt hàng xóm. */
function distancePointToRayWorld(point: THREE.Vector3, ray: THREE.Ray): number {
  _pickAlong.copy(point).sub(ray.origin)
  const t = _pickAlong.dot(ray.direction)
  _pickClosestOnRay.copy(ray.origin).addScaledVector(ray.direction, t)
  return point.distanceTo(_pickClosestOnRay)
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/** Đĩa tròn gần cứng — ít glow để chấm không bị “mờ loang”. Không mipmaps → không nhòe khi xa. */
function createCrispDotTexture(): THREE.CanvasTexture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.78, 'rgba(255,255,255,1)')
  g.addColorStop(0.92, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

interface FossilPointsProps {
  fossilsOverride?: Fossil[] | null
}

export function FossilPoints({ fossilsOverride }: FossilPointsProps = {}) {
  const fossils = useSceneCommandStore((s) =>
    fossilsOverride !== undefined && fossilsOverride !== null ? fossilsOverride : s.fossils,
  )
  const phylumMetadata = useSceneCommandStore((s) => s.phylumMetadata)
  const setFocusedFossil = useSceneCommandStore((s) => s.setFocusedFossil)
  const setFossilDetailOpen = useSceneCommandStore((s) => s.setFossilDetailOpen)
  const setFlyToTarget = useSceneCommandStore((s) => s.setFlyToTarget)
  const setEarthRotationPaused = useSceneCommandStore((s) => s.setEarthRotationPaused)

  const pointsRef = useRef<THREE.Points>(null)
  const [hovered, setHovered] = useState(false)
  /** Khóa pick khi zoom xa — đồng bộ với `pts.visible`. */
  const pickableByZoomRef = useRef(false)
  useCursor(hovered)

  const spriteMap = useMemo(() => createCrispDotTexture(), [])
  useEffect(() => () => spriteMap.dispose(), [spriteMap])

  const { positions, colors, pickableFossils } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const ordered: Fossil[] = []
    const r = EARTH_RADIUS + FOSSIL_ALTITUDE

    fossils.forEach((fossil) => {
      const lng = fossil.paleolng ?? fossil.lng
      const lat = fossil.paleolat ?? fossil.lat
      if (lng == null || lat == null) return

      const position = latLngToVector3(lat, lng, r)
      pos.push(position.x, position.y, position.z)

      const colorHex = getPhylumColor(fossil.phylum, phylumMetadata)
      const color = new THREE.Color(colorHex)
      col.push(color.r, color.g, color.b)
      ordered.push(fossil)
    })

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      pickableFossils: ordered,
    }
  }, [fossils, phylumMetadata])

  const pickableRef = useRef(pickableFossils)
  pickableRef.current = pickableFossils

  useFrame((state) => {
    const pts = pointsRef.current
    const mat = pts?.material as THREE.PointsMaterial | undefined
    if (!pts || !mat) return

    const ctrls = state.controls as unknown as { target?: THREE.Vector3 } | null
    const target = ctrls?.target ?? ORBIT_FALLBACK_TARGET
    const orbitDist = state.camera.position.distanceTo(target)

    const fade = THREE.MathUtils.smoothstep(orbitDist, FOSSIL_ZOOM_DIST_FULL, FOSSIL_ZOOM_DIST_HIDDEN)
    const visibility = 1 - fade

    const pickable = visibility > 0.085
    pickableByZoomRef.current = pickable
    pts.visible = pickable

    mat.opacity = THREE.MathUtils.clamp(visibility, 0, 1)
    mat.size = THREE.MathUtils.lerp(
      FOSSIL_POINT_PX_MIN,
      FOSSIL_POINT_PX_MAX,
      THREE.MathUtils.clamp(visibility, 0, 1),
    )

    if (!pickable && hovered) setHovered(false)
  })

  const onPointerOut = () => setHovered(false)

  const onFossilPointerEvent = (e: ThreeEvent<PointerEvent>) => {
    if (!pickableByZoomRef.current) return
    const idx = e.index
    if (idx === undefined || idx < 0) return
    const fossil = pickableRef.current[idx]
    if (!fossil) return
    const lat = fossil.paleolat ?? fossil.lat
    const lng = fossil.paleolng ?? fossil.lng
    if (lat == null || lng == null) return

    const ptsMesh = pointsRef.current
    if (!ptsMesh) return
    const arr = ptsMesh.geometry.attributes.position.array as Float32Array
    const i3 = idx * 3
    _pickWorld.set(arr[i3], arr[i3 + 1], arr[i3 + 2])
    ptsMesh.localToWorld(_pickWorld)

    const sep = distancePointToRayWorld(_pickWorld, e.ray)
    const camDist = e.camera.position.distanceTo(_pickWorld)
    const allowance = THREE.MathUtils.clamp(camDist * 0.0026, 0.013, 0.036)
    if (sep > allowance) return

    e.stopPropagation()
    setFocusedFossil(fossil)
    setFossilDetailOpen(true)
    setFlyToTarget({ lat, lng, mode: 'single', fossil })
    setEarthRotationPaused(true)
  }

  if (positions.length === 0) return null

  return (
    <points
      ref={pointsRef}
      visible={false}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!pickableByZoomRef.current) return
        setHovered(true)
      }}
      onPointerOut={onPointerOut}
      onPointerDown={onFossilPointerEvent}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={spriteMap}
        vertexColors
        transparent
        opacity={0}
        alphaTest={0.15}
        depthWrite={false}
        size={FOSSIL_POINT_PX_MIN}
        sizeAttenuation={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  )
}
