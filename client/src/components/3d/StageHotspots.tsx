'use client'

import { Html } from '@react-three/drei'
import { latLngToVector3 } from '@/lib/geo'
import { getHotspotsForTime } from '@/lib/stageHotspots'
import { useSceneCommandStore } from '@/features/content3d/earth/public'

const EARTH_RADIUS = 5
const HOTSPOT_OFFSET = 0.09

export function StageHotspots({ timeMa }: { timeMa: number }) {
  const showHotspots = useSceneCommandStore((s) => s.showHotspots)
  const setFlyToTarget = useSceneCommandStore((s) => s.setFlyToTarget)
  if (!showHotspots) return null
  const hotspots = getHotspotsForTime(timeMa)
  if (!hotspots.length) return null

  return (
    <group>
      {hotspots.map((h) => {
        const pos = latLngToVector3(h.lat, h.lng, EARTH_RADIUS + HOTSPOT_OFFSET)
        return (
          <group key={h.id} position={pos}>
            <mesh
              onClick={(e) => {
                e.stopPropagation()
                setFlyToTarget({ lat: h.lat, lng: h.lng, mode: 'single' })
              }}
            >
              <sphereGeometry args={[0.09, 14, 12]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
            <Html center transform sprite distanceFactor={8}>
              <div
                style={{
                  fontSize: 10,
                  color: '#ffe8a3',
                  background: 'rgba(0,0,0,0.42)',
                  border: '1px solid rgba(245,158,11,0.38)',
                  borderRadius: 4,
                  padding: '1px 4px',
                  whiteSpace: 'nowrap',
                  transform: 'translateY(-12px)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {h.label}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
