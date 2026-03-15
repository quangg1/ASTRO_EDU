'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { getPhylumColor } from '@/lib/fossilPhyla'
import type { Fossil } from '@/types'

const EARTH_RADIUS = 5

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

interface FossilPointsProps {
  /** Khi trong khóa học: truyền fossils của thời kỳ này, không đọc từ store */
  fossilsOverride?: Fossil[] | null
}

export function FossilPoints({ fossilsOverride }: FossilPointsProps = {}) {
  const { fossils: storeFossils, phylumMetadata } = useSimulatorStore()
  const fossils = fossilsOverride !== undefined && fossilsOverride !== null ? fossilsOverride : storeFossils
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []

    fossils.forEach((fossil) => {
      // Use paleo coordinates if available
      const lng = fossil.paleolng ?? fossil.lng
      const lat = fossil.paleolat ?? fossil.lat

      if (lng == null || lat == null) return

      const position = latLngToVector3(lat, lng, EARTH_RADIUS + 0.15)
      pos.push(position.x, position.y, position.z)

      const colorHex = getPhylumColor(fossil.phylum, phylumMetadata)
      const color = new THREE.Color(colorHex)
      col.push(color.r, color.g, color.b)
    })

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col)
    }
  }, [fossils, phylumMetadata])

  // Pulse animation
  useFrame((state) => {
    if (pointsRef.current && pointsRef.current.material) {
      const material = pointsRef.current.material as THREE.PointsMaterial
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  if (positions.length === 0) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
