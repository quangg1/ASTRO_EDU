'use client'

/**
 * Earth 3D: CHỈ dùng texture có trong web (public/textures/).
 * - Từ kỷ Neogene trở lại đây (≤ 23 Ma): 6 file 8k_earth_*.
 * - Các thời kì có file trong /textures/paleo/: texture paleo_XXX.jpg.
 * - Còn lại (ví dụ > 750 Ma): màu đơn sắc.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { EarthStage } from '@/types'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { hasPaleoTexture, getPaleoTexturePath } from '@/lib/paleoTextureMap'

const TEXTURE_BASE = '/textures'

interface EarthProps {
  stage: EarthStage
}

export function Earth({ stage }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)

  // Neogene trở lại đây (≤ 23 Ma): 8k_earth; có file paleo: texture paleo; còn lại: màu đơn sắc
  const useRealisticTextures = stage.time <= 23
  const usePaleoTexture = !useRealisticTextures && hasPaleoTexture(stage.time)

  const atmosphereColor = useMemo(
    () => (stage.atmosphereColor ? new THREE.Color(stage.atmosphereColor) : new THREE.Color('#87CEEB')),
    [stage.atmosphereColor]
  )

  // Xoay do nhóm cha (EarthWithFossils) trong EarthScene – không xoay riêng để texture và hóa thạch khớp

  const gridLines = useMemo(() => buildGridLines(), [])

  return (
    <group>
      {/* Earth: 8k_earth (Neogene+) | texture paleo (có trong web) | màu đơn sắc */}
      {useRealisticTextures ? (
        <RealisticEarth ref={earthRef} stage={stage} />
      ) : usePaleoTexture ? (
        <PaleoEarth ref={earthRef} stageTime={stage.time} stage={stage} />
      ) : (
        <ColoredEarth ref={earthRef} stage={stage} />
      )}

      {/* Mây (chỉ khi dùng 8k_earth) */}
      {useRealisticTextures && (
        <CloudsLayer ref={cloudsRef} />
      )}

      {/* Grid (kinh/vĩ tuyến, xích đạo nổi bật) */}
      <group>{gridLines}</group>

      {/* Khí quyển */}
      {stage.atmosphereColor && (
        <Sphere ref={atmosphereRef} args={[5.3, 64, 64]}>
          <meshBasicMaterial
            color={atmosphereColor}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Mây đơn sắc khi không dùng 8k_earth (paleo hoặc màu đơn) */}
      {!useRealisticTextures && stage.time < 100 && (
        <Sphere ref={cloudsRef} args={[5.05, 64, 64]}>
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </Sphere>
      )}

      {stage.hasDebris && <Debris />}
      {stage.hasMeteorites && <Meteorites />}
    </group>
  )
}

function useOptionalTexture(path: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(
      path,
      (loaded) => {
        if (!cancelled) setTexture(loaded)
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [path])
  return texture
}

/** Lục địa + đèn đêm + độ cao (normal) + độ bóng đại dương (specular) */
const RealisticEarth = React.forwardRef<THREE.Mesh, { stage: EarthStage }>(function RealisticEarth(
  { stage },
  ref,
) {
  const day = useOptionalTexture(getStaticAssetUrl(`${TEXTURE_BASE}/8k_earth_daymap.jpg`))
  const night = useOptionalTexture(getStaticAssetUrl(`${TEXTURE_BASE}/8k_earth_nightmap.jpg`))
  const normal = useOptionalTexture(getStaticAssetUrl(`${TEXTURE_BASE}/8k_earth_normal_map.jpg`))
  const specular = useOptionalTexture(getStaticAssetUrl(`${TEXTURE_BASE}/8k_earth_specular_map.jpg`))
  const ready = day && night && normal && specular

  useMemo(() => {
    if (!ready) return
    day.colorSpace = THREE.SRGBColorSpace
    night.colorSpace = THREE.SRGBColorSpace
    day.wrapS = day.wrapT = THREE.RepeatWrapping
    night.wrapS = night.wrapT = THREE.RepeatWrapping
    normal.colorSpace = THREE.LinearSRGBColorSpace
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping
    specular.colorSpace = THREE.LinearSRGBColorSpace
    specular.wrapS = specular.wrapT = THREE.RepeatWrapping
  }, [day, night, normal, specular, ready])

  if (!ready) return <ColoredEarth ref={ref} stage={stage} />

  return (
    <Sphere ref={ref} args={[5, 128, 128]}>
      <meshStandardMaterial
        map={day}
        emissiveMap={night}
        emissiveIntensity={0.22}
        emissive={new THREE.Color(0x0a0a0a)}
        normalMap={normal}
        normalScale={new THREE.Vector2(0.9, 0.9)}
        metalnessMap={specular}
        metalness={0.4}
        roughness={0.6}
      />
    </Sphere>
  )
})

/** Trái Đất theo bản đồ cổ địa lý: cùng texture cho day (map) và night (emissive tối hơn) */
const PaleoEarth = React.forwardRef<THREE.Mesh, { stageTime: number; stage: EarthStage }>(function PaleoEarth(
  { stageTime, stage },
  ref
) {
  const path = getPaleoTexturePath(stageTime)!
  const map = useOptionalTexture(path)
  useMemo(() => {
    if (!map) return
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  }, [map])

  if (!map) return <ColoredEarth ref={ref} stage={stage} />
  return (
    <Sphere ref={ref} args={[5, 128, 128]}>
      <meshStandardMaterial
        map={map}
        emissiveMap={map}
        emissive={new THREE.Color(0x111111)}
        emissiveIntensity={0.18}
        metalness={0.1}
        roughness={0.8}
      />
    </Sphere>
  )
})

/** Fallback khi chưa load xong texture hoặc thời kỳ cổ */
const ColoredEarth = React.forwardRef<THREE.Mesh, { stage: EarthStage }>(function ColoredEarth(
  props,
  ref
) {
  const { stage } = props
  const color = useMemo(() => new THREE.Color(stage.earthColor), [stage.earthColor])
  return (
    <Sphere ref={ref} args={[5, 128, 128]}>
      <meshStandardMaterial
        color={color}
        metalness={0.1}
        roughness={0.8}
        emissive={color}
        emissiveIntensity={stage.time > 4000 ? 0.3 : 0.05}
      />
    </Sphere>
  )
})

/** Lớp mây từ texture */
const CloudsLayer = React.forwardRef<THREE.Mesh>(function CloudsLayer(_, ref) {
  const cloudsTex = useOptionalTexture(getStaticAssetUrl(`${TEXTURE_BASE}/8k_earth_clouds.jpg`))
  if (!cloudsTex) return null
  cloudsTex.colorSpace = THREE.SRGBColorSpace
  cloudsTex.wrapS = cloudsTex.wrapT = THREE.RepeatWrapping

  return (
    <Sphere ref={ref} args={[5.05, 64, 64]}>
      <meshStandardMaterial
        map={cloudsTex}
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </Sphere>
  )
})

function buildGridLines() {
  const lines: JSX.Element[] = []
  const R = 5.02
  const opacity = 0.35
  const opacityEquator = 0.7

  // Vĩ tuyến (lat) — xích đạo (0°) đậm hơn
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = (90 - lat) * (Math.PI / 180)
    const r = R * Math.sin(phi)
    const y = R * Math.cos(phi)
    const isEquator = lat === 0
    const lineWidth = isEquator ? 0.02 : 0.01
    const op = isEquator ? opacityEquator : opacity
    const color = isEquator ? '#00FFFF' : '#FFD700'
    lines.push(
      <mesh key={`lat-${lat}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - lineWidth, r + lineWidth, 64]} />
        <meshBasicMaterial color={color} transparent opacity={op} side={THREE.DoubleSide} />
      </mesh>
    )
  }

  // Kinh tuyến (lng)
  for (let lng = 0; lng < 360; lng += 30) {
    const theta = (lng * Math.PI) / 180
    lines.push(
      <mesh key={`lng-${lng}`} rotation={[0, theta, 0]}>
        <torusGeometry args={[R, 0.01, 8, 64]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={opacity} />
      </mesh>
    )
  }

  return lines
}

// Debris component for early Earth
function Debris() {
  const debrisRef = useRef<THREE.Group>(null)
  
  const debris = useMemo(() => {
    const items: { position: THREE.Vector3; size: number; speed: number }[] = []
    for (let i = 0; i < 100; i++) {
      const distance = 8 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      items.push({
        position: new THREE.Vector3(
          distance * Math.sin(phi) * Math.cos(theta),
          distance * Math.cos(phi),
          distance * Math.sin(phi) * Math.sin(theta)
        ),
        size: 0.1 + Math.random() * 0.3,
        speed: 0.001 + Math.random() * 0.002
      })
    }
    return items
  }, [])

  useFrame(() => {
    if (debrisRef.current) {
      debrisRef.current.children.forEach((child, i) => {
        child.position.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          debris[i].speed
        )
      })
    }
  })

  return (
    <group ref={debrisRef}>
      {debris.map((d, i) => (
        <mesh key={i} position={d.position}>
          <sphereGeometry args={[d.size, 8, 8]} />
          <meshStandardMaterial color="#8B4513" emissive="#331100" />
        </mesh>
      ))}
    </group>
  )
}

// Meteorites component
function Meteorites() {
  const meteoritesRef = useRef<THREE.Group>(null)
  
  const meteorites = useMemo(() => {
    const items: { 
      position: THREE.Vector3
      velocity: THREE.Vector3
      size: number 
    }[] = []
    
    for (let i = 0; i < 20; i++) {
      const startDist = 50
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * startDist,
        (Math.random() - 0.5) * startDist,
        (Math.random() - 0.5) * startDist
      )
      
      const vel = pos.clone().negate().normalize().multiplyScalar(0.2 + Math.random() * 0.1)
      
      items.push({
        position: pos,
        velocity: vel,
        size: 0.2 + Math.random() * 0.5
      })
    }
    return items
  }, [])

  useFrame(() => {
    if (meteoritesRef.current) {
      meteoritesRef.current.children.forEach((child, i) => {
        child.position.add(meteorites[i].velocity)
        
        // Reset if too close
        if (child.position.length() < 6) {
          const startDist = 50
          child.position.set(
            (Math.random() - 0.5) * startDist,
            (Math.random() - 0.5) * startDist,
            (Math.random() - 0.5) * startDist
          )
          meteorites[i].velocity = child.position.clone()
            .negate()
            .normalize()
            .multiplyScalar(0.2 + Math.random() * 0.1)
        }
      })
    }
  })

  return (
    <group ref={meteoritesRef}>
      {meteorites.map((m, i) => (
        <mesh key={i} position={m.position}>
          <sphereGeometry args={[m.size, 8, 8]} />
          <meshStandardMaterial 
            color="#FF4500" 
            emissive="#FF6347" 
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}
