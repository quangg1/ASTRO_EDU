'use client'

/**
 * Nhãn địa lý (tên thành phố / vùng) trên quả cầu.
 * Chỉ hiển thị khi dùng texture "hiện đại" (time <= 23 Ma) để tọa độ khớp bản đồ.
 */

import React from 'react'
import { Html } from '@react-three/drei'
import { latLngToVector3 } from '@/lib/geo'
import { GEO_PLACES } from '@/lib/geoPlaces'

const EARTH_RADIUS = 5
/** Khoảng cách nhãn nhô ra khỏi bề mặt (để pin đứng trên mặt cầu) */
const LABEL_OFFSET = 0.06

interface GeoLabelsProps {
  /** Có hiển thị nhãn địa danh không */
  visible: boolean
}

export function GeoLabels({ visible }: GeoLabelsProps) {
  if (!visible) return null

  return (
    <group>
      {GEO_PLACES.map((place, i) => {
        const pos = latLngToVector3(place.lat, place.lng, EARTH_RADIUS + LABEL_OFFSET)
        return (
          <group key={`${place.name}-${i}`} position={pos}>
            <Html
              center
              transform
              sprite
              distanceFactor={8}
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                opacity: 0.95,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                }}
              >
                {/* Pin (chấm tím giống ảnh tham khảo) */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    marginBottom: 2,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                  }}
                />
                {/* Tên địa danh */}
                <span
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#ffffff',
                    textShadow: '0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)',
                    padding: '1px 4px',
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: 3,
                  }}
                >
                  {place.name}
                </span>
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
