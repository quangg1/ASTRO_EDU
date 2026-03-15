'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface MoonProps {
  distance: number
}

export function Moon({ distance }: MoonProps) {
  const moonRef = useRef<THREE.Mesh>(null)
  const orbitRef = useRef<THREE.Group>(null)
  
  const moonDistance = Math.max(8, distance)
  const orbitSpeed = 0.01 * (40 / moonDistance)

  useFrame((state) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = state.clock.elapsedTime * orbitSpeed
    }
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.001
    }
  })

  return (
    <group ref={orbitRef}>
      <Sphere 
        ref={moonRef} 
        args={[1, 32, 32]} 
        position={[moonDistance, 0, 0]}
      >
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.1}
          roughness={0.9}
        />
      </Sphere>
    </group>
  )
}
