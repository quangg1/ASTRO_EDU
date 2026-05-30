'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function ExploreEntityFx({
  entityId,
  planetPositionsRef,
  selectedIndex,
  selectedRadius,
  visible,
}: {
  entityId?: string | null
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  selectedIndex: number | null
  selectedRadius: number
  visible: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const spinARef = useRef<THREE.Group>(null)
  const spinBRef = useRef<THREE.Group>(null)
  const greenhouseHeatPoints = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 260; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * Math.PI * 2
      const phi = Math.acos(2 * v - 1)
      const r = selectedRadius * (1.16 + Math.random() * 0.08)
      pts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
    }
    return new Float32Array(pts)
  }, [selectedRadius])

  useFrame((_, dt) => {
    if (!groupRef.current || selectedIndex === null) return
    const p = planetPositionsRef.current[selectedIndex]
    if (!p || p.lengthSq() < 1e-6) return
    groupRef.current.position.copy(p)
    if (spinARef.current) spinARef.current.rotation.y += dt * 0.25
    if (spinBRef.current) spinBRef.current.rotation.y -= dt * 0.16
  })

  if (!visible || !entityId || selectedIndex === null) return null

  if (entityId === 'venus-atmosphere') {
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[selectedRadius * 1.08, 64, 64]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            uniforms={{
              uColor: { value: new THREE.Color('#ffd9a6') },
              uPower: { value: 2.2 },
              uIntensity: { value: 0.92 },
              uOpacity: { value: 0.38 },
            }}
            vertexShader={`
              varying vec3 vWorldNormal;
              varying vec3 vViewDir;
              void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                vViewDir = normalize(cameraPosition - worldPos.xyz);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
              }
            `}
            fragmentShader={`
              uniform vec3 uColor;
              uniform float uPower;
              uniform float uIntensity;
              uniform float uOpacity;
              varying vec3 vWorldNormal;
              varying vec3 vViewDir;
              void main() {
                float fresnel = pow(1.0 - max(dot(vWorldNormal, vViewDir), 0.0), uPower);
                float alpha = clamp(fresnel * uIntensity, 0.0, 1.0) * uOpacity;
                gl_FragColor = vec4(uColor, alpha);
              }
            `}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[selectedRadius * 1.14, 56, 56]} />
          <meshBasicMaterial
            color="#ffbf80"
            transparent
            opacity={0.16}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    )
  }

  if (entityId === 'venus-greenhouse') {
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[selectedRadius * 1.15, 56, 56]} />
          <meshBasicMaterial
            color="#ff9c52"
            transparent
            opacity={0.14}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[selectedRadius * 1.22, 56, 56]} />
          <meshBasicMaterial
            color="#ff6a00"
            transparent
            opacity={0.07}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={greenhouseHeatPoints}
              count={greenhouseHeatPoints.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ff7a33"
            size={selectedRadius * 0.01}
            sizeAttenuation
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </points>
      </group>
    )
  }

  if (entityId === 'venus-clouds') {
    return (
      <group ref={groupRef}>
        <group ref={spinARef}>
          <mesh rotation={[Math.PI / 2 + 0.1, 0, 0]}>
            <torusGeometry args={[selectedRadius * 1.05, selectedRadius * 0.012, 14, 120]} />
            <meshBasicMaterial color="#fff3d6" transparent opacity={0.38} />
          </mesh>
        </group>
        <group ref={spinBRef}>
          <mesh rotation={[Math.PI / 2 - 0.08, 0.4, 0]}>
            <torusGeometry args={[selectedRadius * 1.11, selectedRadius * 0.01, 14, 120]} />
            <meshBasicMaterial color="#ffe8bf" transparent opacity={0.28} />
          </mesh>
        </group>
      </group>
    )
  }

  if (entityId === 'venus-pressure') {
    return (
      <group ref={groupRef}>
        {[1.06, 1.13, 1.2, 1.27].map((s, idx) => (
          <mesh key={s}>
            <sphereGeometry args={[selectedRadius * s, 36, 36]} />
            <meshBasicMaterial color="#ff9e80" transparent opacity={0.18 - idx * 0.03} wireframe />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      <group ref={spinARef}>
        <mesh rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <torusGeometry args={[selectedRadius * 1.26, selectedRadius * 0.015, 16, 140]} />
          <meshBasicMaterial color="#c4b5fd" transparent opacity={0.48} />
        </mesh>
      </group>
      <group ref={spinBRef}>
        <mesh position={[selectedRadius * 1.26, 0, 0]}>
          <sphereGeometry args={[selectedRadius * 0.05, 16, 16]} />
          <meshBasicMaterial color="#e9d5ff" />
        </mesh>
      </group>
    </group>
  )
}
