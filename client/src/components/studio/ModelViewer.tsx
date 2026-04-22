'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Center, ContactShadows } from '@react-three/drei'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  )
}

interface Props {
  url: string
}

function isDirectModelUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    const path = u.pathname.toLowerCase()
    return path.endsWith('.glb') || path.endsWith('.gltf')
  } catch {
    const lower = String(rawUrl || '').toLowerCase().split('?')[0]
    return lower.endsWith('.glb') || lower.endsWith('.gltf')
  }
}

export default function ModelViewer({ url }: Props) {
  if (!isDirectModelUrl(url)) {
    return (
      <div className="w-full h-full bg-black/40">
        <iframe
          src={url}
          className="w-full h-full"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      </div>
    )
  }

  return (
    <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={null}>
        <Model url={url} />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.4} blur={2} />
      </Suspense>
      <OrbitControls
        autoRotate
        autoRotateSpeed={1.5}
        enablePan={false}
        minDistance={1}
        maxDistance={10}
      />
    </Canvas>
  )
}
