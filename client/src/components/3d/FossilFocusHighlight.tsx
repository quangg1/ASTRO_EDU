'use client'

import { Billboard, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { latLngToVector3 } from '@/lib/geo'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import type { Fossil } from '@/types'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

const EARTH_RADIUS = 5
const SINGLE_MARKER_RADIUS = EARTH_RADIUS + 0.22
const SINGLE_MARKER_SIZE = 0.09
/** Đẩy nhãn ra xa bề mặt để không che chấm pulse khi zoom gần. */
const NAME_CHIP_SURFACE_OFFSET = 0.92

const WORLD_SCRATCH = new THREE.Vector3()

const meshNoRaycast: THREE.Mesh['raycast'] = () => {}

interface PulseDotProps {
  lat: number
  lng: number
}

/** Chấm + vòng pulse — co theo khoảng cách camera để không khổng lồ khi zoom tối đa. */
function PulseDot({ lat, lng }: PulseDotProps) {
  const { pos, quat } = useMemo(() => {
    const p = latLngToVector3(lat, lng, SINGLE_MARKER_RADIUS)
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      p.clone().normalize(),
    )
    return { pos: p, quat: q }
  }, [lat, lng])
  const rootRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (rootRef.current) {
      rootRef.current.getWorldPosition(WORLD_SCRATCH)
      const d = state.camera.position.distanceTo(WORLD_SCRATCH)
      const k = THREE.MathUtils.clamp(d * 0.088 + 0.38, 0.42, 0.92)
      rootRef.current.scale.setScalar(k)
    }
    if (!ringRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 2.5) * 0.2
    ringRef.current.scale.setScalar(pulse)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.34 + Math.sin(t * 2.5) * 0.18
  })

  return (
    <group ref={rootRef} position={[pos.x, pos.y, pos.z]}>
      <mesh raycast={meshNoRaycast}>
        <sphereGeometry args={[SINGLE_MARKER_SIZE, 16, 12]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      <mesh ref={ringRef} quaternion={quat} raycast={meshNoRaycast}>
        <torusGeometry args={[0.185, 0.026, 12, 24]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.58} depthWrite={false} />
      </mesh>
    </group>
  )
}

function FossilNameChip({
  lat,
  lng,
  name,
  fossil,
}: {
  lat: number
  lng: number
  name: string
  fossil: Fossil | null
}) {
  const pos = useMemo(() => latLngToVector3(lat, lng, EARTH_RADIUS + NAME_CHIP_SURFACE_OFFSET), [lat, lng])
  const chipRootRef = useRef<THREE.Group>(null)
  const setFossilDetailOpen = useSceneCommandStore((s) => s.setFossilDetailOpen)
  const setFocusedFossil = useSceneCommandStore((s) => s.setFocusedFossil)

  useFrame((state) => {
    if (!chipRootRef.current) return
    chipRootRef.current.getWorldPosition(WORLD_SCRATCH)
    const d = state.camera.position.distanceTo(WORLD_SCRATCH)
    const sc = THREE.MathUtils.clamp(3.5 / (d + 2.1), 0.46, 0.92)
    chipRootRef.current.scale.setScalar(sc)
  })

  return (
    <group ref={chipRootRef} position={pos}>
      <Billboard follow lockZ={false}>
        <Html
          transform
          occlude={false}
          center
          distanceFactor={3.85}
          position={[0, 0.3, 0]}
          style={{ pointerEvents: 'auto' }}
          zIndexRange={[100, 0]}
        >
          <div className="flex max-w-[min(188px,40vw)] items-center gap-0.5 rounded-full border border-cyan-400/50 bg-ds-surface/96 py-0.5 pl-2 pr-0.5 text-[9px] font-semibold leading-tight text-cyan-50 shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left hover:text-ds-text"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (fossil) setFocusedFossil(fossil)
                setFossilDetailOpen(true)
              }}
              title="Xem chi tiết"
            >
              {name}
            </button>
            <button
              type="button"
              className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-ds-border text-[11px] leading-none text-ds-muted hover:border-rose-300/40 hover:bg-rose-950/40 hover:text-rose-100"
              title="Bỏ chọn"
              aria-label="Bỏ chọn hóa thạch"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                useSceneCommandStore.getState().clearAllGlobeFossilUi()
              }}
            >
              ×
            </button>
          </div>
        </Html>
      </Billboard>
    </group>
  )
}

/**
 * Pulse + nhãn tên (nhấn nhãn → mở panel chi tiết).
 * Ưu tiên fly-to đang chạy; sau đó dùng focusedFossil trong store.
 */
export function FossilFocusHighlight() {
  const flyToTarget = useSceneCommandStore((s) => s.flyToTarget)
  const focusedFossil = useSceneCommandStore((s) => s.focusedFossil)

  const payload = useMemo(() => {
    if (flyToTarget?.mode === 'single') {
      const f = flyToTarget.fossil ?? null
      return {
        lat: flyToTarget.lat,
        lng: flyToTarget.lng,
        name: f?.name ?? null,
        fossil: f,
      }
    }
    if (focusedFossil) {
      const lat = focusedFossil.paleolat ?? focusedFossil.lat
      const lng = focusedFossil.paleolng ?? focusedFossil.lng
      return { lat, lng, name: focusedFossil.name || null, fossil: focusedFossil }
    }
    return null
  }, [flyToTarget, focusedFossil])

  if (!payload) return null

  return (
    <group>
      <PulseDot lat={payload.lat} lng={payload.lng} />
      {payload.name ? (
        <FossilNameChip
          lat={payload.lat}
          lng={payload.lng}
          name={payload.name}
          fossil={payload.fossil}
        />
      ) : null}
    </group>
  )
}
