'use client'

import { Html } from '@react-three/drei'
import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { NarrativeSite } from '@/features/content3d/narrative/types'
import { siteSurfacePosition } from '@/features/content3d/narrative/lib/globeCamera'

type Props = {
  site: NarrativeSite
  selected: boolean
  onPick: (site: NarrativeSite) => void
}

const PIN_RENDER_ORDER = 24

/**
 * Pin địa danh: sphere tròn + nhãn sprite (giống StageHotspots Trái Đất).
 * Không dùng PointsMaterial vuông — địa điểm đã có `NarrativeSitePin`, không trùng layer núi lửa era.
 */
export function NarrativeSitePin({ site, selected, onPick }: Props) {
  const [hovered, setHovered] = useState(false)
  const position = useMemo(
    () => siteSurfacePosition(site.lat, site.lng),
    [site.lat, site.lng],
  )

  const handlePick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick(site)
  }

  const hot = selected || hovered
  const label = site.nameVi?.trim() || site.nameEn?.trim() || site.id

  return (
    <group position={position} renderOrder={PIN_RENDER_ORDER}>
      {/* Hit target rộng — dễ bấm */}
      <mesh
        visible={false}
        renderOrder={PIN_RENDER_ORDER + 1}
        onPointerDown={handlePick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.34, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh
        renderOrder={PIN_RENDER_ORDER + 2}
        onPointerDown={handlePick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[hot ? 0.11 : 0.09, 16, 14]} />
        <meshBasicMaterial
          color={selected ? '#fecaca' : '#fb923c'}
          transparent
          opacity={hot ? 1 : 0.92}
          toneMapped={false}
          depthTest
          depthWrite={false}
        />
      </mesh>

      <Html
        center
        transform
        sprite
        distanceFactor={7.2}
        zIndexRange={[120, 0]}
        style={{ pointerEvents: 'none' }}
        wrapperClass="narrative-site-pin-label"
      >
        <div
          style={{
            transform: 'translateY(-16px)',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.25,
            color: hot ? '#fff7ed' : '#fed7aa',
            background: 'rgba(8, 6, 12, 0.72)',
            border: `1px solid ${hot ? 'rgba(251, 146, 60, 0.65)' : 'rgba(251, 146, 60, 0.38)'}`,
            borderRadius: 6,
            padding: '2px 7px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            boxShadow: '0 2px 10px rgba(0,0,0,0.55)',
            letterSpacing: '0.02em',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}
