'use client'

import React, { Suspense, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import type { IconicOrganism } from '@/lib/iconicOrganisms'

const Canvas = dynamic(() => import('@react-three/fiber').then((m) => m.Canvas), { ssr: false })

interface Organism3DViewerProps {
  organism: IconicOrganism
  onClose: () => void
}

/** Nội dung 3D bên trong Canvas: load GLB, scale vừa khung, ánh sáng + OrbitControls */
function SceneContent({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!scene) return
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.001)
    const scale = 2 / maxDim
    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale)
      const center = box.getCenter(new THREE.Vector3())
      groupRef.current.position.sub(center.multiplyScalar(scale))
    }
  }, [scene])

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 8, 5]} intensity={2} />
      <directionalLight position={[-4, 6, 4]} intensity={1.2} />
      <directionalLight position={[0, 5, -3]} intensity={1} />
      <Environment preset="studio" />
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  )
}

export function Organism3DViewer({ organism, onClose }: Organism3DViewerProps) {
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setAnimating(false), 320)
    return () => clearTimeout(t)
  }, [])

  if (!organism.modelUrl) return null

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem 3D: ${organism.nameVi}`}
    >
      <div
        className={`
          relative w-full max-w-2xl aspect-square max-h-[85vh] rounded-2xl overflow-hidden
          bg-gradient-to-b from-gray-600 to-gray-800 border border-cyan-400/40 shadow-2xl
          transition-all duration-300 ease-out
          ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0">
          {mounted && (
            <Canvas
              camera={{ position: [0, 0, 4], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              className="w-full h-full"
            >
              <Suspense
                fallback={
                  <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#333" wireframe />
                  </mesh>
                }
              >
                <SceneContent modelUrl={organism.modelUrl} />
              </Suspense>
            </Canvas>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
          <h3 className="text-lg font-bold text-white">{organism.nameVi}</h3>
          {organism.name !== organism.nameVi && (
            <p className="text-sm text-gray-400">{organism.name}</p>
          )}
          <p className="text-sm text-gray-300 mt-1 line-clamp-2">{organism.description}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl flex items-center justify-center transition-colors"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body)
  }
  return modal
}
