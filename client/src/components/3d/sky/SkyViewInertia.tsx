'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { SkyViewState } from './skyViewState'
import { applyViewInertia, type ViewVelocity } from './skyDragPhysics'

type Props = {
  view: SkyViewState
  draggingRef: React.MutableRefObject<boolean>
  velocityRef: React.MutableRefObject<ViewVelocity>
  onViewChange: (v: SkyViewState) => void
}

export function SkyViewInertia({ view, draggingRef, velocityRef, onViewChange }: Props) {
  const viewRef = useRef(view)
  viewRef.current = view

  useFrame((_, delta) => {
    if (draggingRef.current) return
    const v = velocityRef.current
    if (Math.abs(v.az) < 0.00002 && Math.abs(v.alt) < 0.00002) return
    const { view: next, vel } = applyViewInertia(viewRef.current, v, Math.min(delta, 0.05))
    velocityRef.current = vel
    onViewChange(next)
  })

  return null
}
