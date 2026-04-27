'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { ShowcaseEntityMesh } from '@/components/3d/showcase/ShowcaseEntityMesh'

function PreviewEntityNode({ entity }: { entity: ShowcaseOrbitEntity }) {
  return (
    <group position={[0, 0, 0]}>
      <ShowcaseEntityMesh entity={entity} active visualOpacity={1} />
    </group>
  )
}

export function ShowcaseEntityPreviewCard({
  entity,
  effectiveTextureUrl,
}: {
  entity: ShowcaseOrbitEntity
  effectiveTextureUrl: string
}) {
  const mediaSummary = useMemo(() => {
    const model = String(entity.remoteModelUrl || '').trim()
    const diffuse = String(entity.remoteTextureUrl || entity.texturePath || '').trim()
    const normal = String(entity.remoteNormalMapUrl || '').trim()
    const spec = String(entity.remoteSpecularMapUrl || '').trim()
    const cloud = String(entity.remoteCloudMapUrl || '').trim()
    return { model, diffuse, normal, spec, cloud }
  }, [entity])

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Live preview (Showcase renderer)</h2>
        <span className="text-[11px] text-slate-400">Orbit drag • wheel zoom</span>
      </div>
      <div className="h-[290px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
        <Canvas
          camera={{ position: [0, 0, 4.2], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
          }}
        >
          <color attach="background" args={['#04070c']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 1.6, 2.2]} intensity={1.15} />
          <directionalLight position={[-2, -1, -1.6]} intensity={0.28} />
          <Stars radius={22} depth={12} count={1300} factor={2} saturation={0.85} fade speed={0.2} />
          <Suspense fallback={null}>
            <PreviewEntityNode entity={entity} />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={1.8} maxDistance={9} autoRotate autoRotateSpeed={0.9} />
        </Canvas>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-slate-500 uppercase tracking-wide mb-1">Effective diffuse</p>
          <p className="font-mono text-cyan-300 break-all">{effectiveTextureUrl || '(none)'}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-slate-500 uppercase tracking-wide mb-1">Model URL</p>
          <p className="font-mono text-cyan-300 break-all">{mediaSummary.model || '(none)'}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-slate-500 uppercase tracking-wide mb-1">Normal</p>
          <p className="font-mono text-cyan-300 break-all">{mediaSummary.normal || '(none)'}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-slate-500 uppercase tracking-wide mb-1">Specular / Cloud</p>
          <p className="font-mono text-cyan-300 break-all">
            {mediaSummary.spec || '(none)'} / {mediaSummary.cloud || '(none)'}
          </p>
        </div>
      </div>
    </div>
  )
}
