'use client'

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Preload } from '@react-three/drei'
import { Suspense, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { getStaticAssetUrl } from '@/lib/apiConfig'

const MILKY_WAY_TEXTURE = '/textures/8k_stars_milky_way.jpg'
const SKYBOX_RADIUS = 400

/** Tạo texture hình tròn mềm cho point sprites – sao không còn pixel vuông */
function createSoftStarTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const r = size / 2
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Zoom vào vùng Milky Way: repeat + offset để chỉ hiển thị phần giữa ảnh (dải sáng rõ hơn) */
const MILKY_ZOOM = 0.45
const MILKY_OFFSET_X = 0.275
const MILKY_OFFSET_Y = 0.275

/** Bầu trời Milky Way – texture phủ sphere, zoom vào dải Milky Way ở giữa ảnh */
function MilkyWaySkybox() {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useLoader(THREE.TextureLoader, getStaticAssetUrl(MILKY_WAY_TEXTURE)) as THREE.Texture
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.flipY = false
    texture.repeat.set(MILKY_ZOOM, MILKY_ZOOM)
    texture.offset.set(MILKY_OFFSET_X, MILKY_OFFSET_Y)
  }, [texture])

  return (
    <mesh ref={meshRef} rotation={[-0.25, Math.PI * 0.5, 0]}>
      <sphereGeometry args={[SKYBOX_RADIUS, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

/** Sao bổ sung – dùng texture tròn mềm, ít và nhỏ để không che Milky Way */
function Starfield() {
  const pointsRef = useRef<THREE.Points>(null)
  const starTexture = useMemo(() => (typeof document !== 'undefined' ? createSoftStarTexture() : null), [])
  const count = 2000
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * (SKYBOX_RADIUS - 80)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      const b = 0.6 + Math.random() * 0.35
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = b
    }
    return { positions: pos, colors: col }
  }, [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={starTexture ?? undefined}
        vertexColors
        transparent
        opacity={0.85}
        size={0.5}
        sizeAttenuation
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  )
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[50, 50, 50]} intensity={0.3} color="#ffffff" />

      <MilkyWaySkybox />
      <Starfield />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={15}
        maxDistance={SKYBOX_RADIUS - 20}
        target={[0, 0, 0]}
      />
    </>
  )
}

export default function MilkyWayScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 25], fov: 75 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
