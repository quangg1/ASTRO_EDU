'use client'

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars, Preload } from '@react-three/drei'
import { Suspense, useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { sunData, planetsData, type PlanetData } from '@/lib/solarSystemData'

const origin = new THREE.Vector3(0, 0, 0)

const SUN_SPIN_PERIOD = 25

/** Số đoạn tạo vòng tròn quỹ đạo */
const ORBIT_SEGMENTS = 128

/** Vẽ đường quỹ đạo (vòng tròn nằm ngang XZ) với màu riêng cho từng hành tinh */
function OrbitPath({ distance, color }: { distance: number; color: string }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * Math.PI * 2
      pts.push(new THREE.Vector3(distance * Math.cos(t), 0, distance * Math.sin(t)))
    }
    return pts
  }, [distance])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [points])
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </lineLoop>
  )
}

/** Mặt Trời – tự quay quanh trục; click → chuyển tâm về Mặt Trời */
function Sun({ onSelect }: { onSelect: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useLoader(THREE.TextureLoader, sunData.texture) as THREE.Texture
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  }, [texture])
  useFrame((_, delta) => {
    if (groupRef.current) {
      const spinSpeed = (2 * Math.PI) / SUN_SPIN_PERIOD
      groupRef.current.rotation.y += delta * spinSpeed
    }
  })
  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh>
        <sphereGeometry args={[sunData.radius * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#ffeedd"
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[sunData.radius, 64, 64]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  )
}

/** Click hành tinh → chuyển tâm nhìn tới hành tinh đó; ghi position vào ref để TargetController đọc */
function Planet({
  data,
  index,
  positionRef,
  onSelect,
  onPlanetSelect,
}: {
  data: PlanetData
  index: number
  positionRef: React.MutableRefObject<THREE.Vector3[]>
  onSelect: () => void
  onPlanetSelect?: (index: number) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const map = useLoader(THREE.TextureLoader, data.texture) as THREE.Texture
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  }, [map])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const orbitSpeed = (2 * Math.PI) / data.period
    angleRef.current += delta * orbitSpeed
    const a = angleRef.current
    groupRef.current.position.set(data.distance * Math.cos(a), 0, data.distance * Math.sin(a))
    if (positionRef.current[index]) positionRef.current[index].copy(groupRef.current.position)
    if (spinRef.current) {
      const spinSpeed = (2 * Math.PI) / data.spinPeriod
      spinRef.current.rotation.y += delta * spinSpeed
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
            onPlanetSelect?.(index)
          }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <sphereGeometry args={[data.radius, 32, 32]} />
          <meshStandardMaterial
            map={map}
            roughness={0.75}
            metalness={0.08}
          />
        </mesh>
        {data.ringTexture && (
          <PlanetRing
            inner={data.ringInner! * data.radius}
            outer={data.ringOuter! * data.radius}
            texturePath={data.ringTexture}
          />
        )}
      </group>
    </group>
  )
}

function PlanetRing({
  inner,
  outer,
  texturePath,
}: {
  inner: number
  outer: number
  texturePath: string
}) {
  const ringTex = useLoader(THREE.TextureLoader, texturePath) as THREE.Texture
  useMemo(() => {
    ringTex.colorSpace = THREE.SRGBColorSpace
  }, [ringTex])
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 64]} />
      <meshBasicMaterial
        map={ringTex}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Ánh sáng từ Mặt Trời – mạnh để các hành tinh sáng rõ */
function SunLight() {
  return (
    <>
      <pointLight
        position={[0, 0, 0]}
        intensity={55}
        color="#fff8ee"
        distance={200}
        decay={1.2}
      />
      <pointLight
        position={[0, 0, 0]}
        intensity={20}
        color="#ffffff"
        distance={0}
        decay={0}
      />
    </>
  )
}

/** Cập nhật target OrbitControls theo hành tinh được chọn */
function TargetController({
  controlsRef,
  planetPositionsRef,
  selectedIndex,
}: {
  controlsRef: React.RefObject<{ target: THREE.Vector3 } | null>
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  selectedIndex: number | null
}) {
  useFrame(() => {
    if (!controlsRef?.current) return
    const target = controlsRef.current.target
    if (selectedIndex === null) {
      target.lerp(origin, 0.08)
    } else if (planetPositionsRef.current[selectedIndex]) {
      target.lerp(planetPositionsRef.current[selectedIndex], 0.08)
    }
  })
  return null
}

function SceneContent({ onPlanetSelect }: { onPlanetSelect?: (index: number) => void }) {
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null)
  const planetPositionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: planetsData.length }, () => new THREE.Vector3())
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <>
      <ambientLight intensity={0.28} />
      <SunLight />

      {/* Quỹ đạo màu – vẽ trước để nằm phía sau hành tinh */}
      {planetsData.map((data) => (
        <OrbitPath key={data.name} distance={data.distance} color={data.orbitColor} />
      ))}

      <Sun onSelect={() => setSelectedIndex(null)} />
      {planetsData.map((data, i) => (
        <Planet
          key={data.name}
          data={data}
          index={i}
          positionRef={planetPositionsRef}
          onSelect={() => setSelectedIndex(i)}
          onPlanetSelect={onPlanetSelect}
        />
      ))}

      <Stars radius={200} depth={80} count={3000} factor={4} saturation={0} fade speed={1} />

      <TargetController
        controlsRef={controlsRef}
        planetPositionsRef={planetPositionsRef}
        selectedIndex={selectedIndex}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={120}
        target={[0, 0, 0]}
        panSpeed={0.8}
        zoomSpeed={1.2}
        rotateSpeed={0.6}
      />
    </>
  )
}

export default function SolarSystemScene({
  onPlanetSelect,
}: {
  onPlanetSelect?: (index: number) => void
}) {
  return (
    <Canvas
      camera={{ position: [0, 25, 45], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000' }}
    >
      <Suspense fallback={null}>
        <SceneContent onPlanetSelect={onPlanetSelect} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
