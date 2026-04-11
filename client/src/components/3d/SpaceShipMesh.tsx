'use client'

/**
 * Simple procedural spaceship (cone nose + body + emissive windows).
 * Parent group sets world position / rotation.
 */
export default function SpaceShipMesh() {
  return (
    <group scale={0.85}>
      {/* Nose */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.38, 1.1, 10]} />
        <meshStandardMaterial
          color="#dbeafe"
          metalness={0.65}
          roughness={0.32}
          emissive="#38bdf8"
          emissiveIntensity={0.12}
        />
      </mesh>
      {/* Hull */}
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.48, 0.65, 10]} />
        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.55}
          roughness={0.4}
          emissive="#64748b"
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* Engine ring */}
      <mesh position={[0, -1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.06, 8, 24]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.45}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      {/* Subtle forward light */}
      <pointLight position={[0, 0.6, 0.4]} intensity={1.2} distance={8} color="#7dd3fc" />
    </group>
  )
}
