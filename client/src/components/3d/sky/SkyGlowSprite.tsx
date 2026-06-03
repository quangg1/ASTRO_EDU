'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { getGlowSpriteTexture } from './skyVisuals'
import { SKY_RENDER_ORDER } from './skyLayers'

type Props = {
  position: [number, number, number]
  size: number
  color?: string
  opacity?: number
  onClick?: () => void
  renderOrder?: number
}

export function SkyGlowSprite({
  position,
  size,
  color = '#ffffff',
  opacity = 0.92,
  onClick,
  renderOrder = SKY_RENDER_ORDER.planets,
}: Props) {
  const map = useMemo(() => getGlowSpriteTexture(), [])

  return (
    <sprite
      position={position}
      scale={[size, size, 1]}
      renderOrder={renderOrder}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
    >
      <spriteMaterial
        map={map}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}
