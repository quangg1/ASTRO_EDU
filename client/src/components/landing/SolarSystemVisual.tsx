'use client'

import { useEffect, useRef } from 'react'

const PLANETS = [
  { name: 'mercury', orbit: 80,  size: 5,  color: '#b5b5b5', speed: 5,   startAngle: 45  },
  { name: 'venus',   orbit: 112, size: 8,  color: '#e8cda0', speed: 9,   startAngle: 200 },
  { name: 'earth',   orbit: 150, size: 9,  color: '#4a90d9', speed: 14,  startAngle: 290 },
  { name: 'mars',    orbit: 192, size: 7,  color: '#c1440e', speed: 24,  startAngle: 160 },
  { name: 'jupiter', orbit: 255, size: 18, color: '#c88b3a', speed: 65,  startAngle: 330 },
  { name: 'saturn',  orbit: 310, size: 14, color: '#e4d191', speed: 110, startAngle: 80  },
  { name: 'uranus',  orbit: 358, size: 11, color: '#7de8e8', speed: 200, startAngle: 240 },
  { name: 'neptune', orbit: 400, size: 10, color: '#4b70dd', speed: 320, startAngle: 10  },
]

const STAR_COUNT = 160

function generateStars(seed: number) {
  const stars: { x: number; y: number; r: number; opacity: number }[] = []
  let s = seed
  for (let i = 0; i < STAR_COUNT; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const x = ((s >>> 16) & 0xffff) / 65535
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const y = ((s >>> 16) & 0xffff) / 65535
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const r = 0.4 + (((s >>> 16) & 0xff) / 255) * 1.4
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const opacity = 0.25 + (((s >>> 16) & 0xff) / 255) * 0.65
    stars.push({ x: x * 900, y: y * 900, r, opacity })
  }
  return stars
}

const STARS = generateStars(42)
const CX = 450
const CY = 450

export function SolarSystemVisual() {
  const groupRefs = useRef<(SVGGElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    function animate(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = (ts - startRef.current) / 1000

      PLANETS.forEach((planet, i) => {
        const el = groupRefs.current[i]
        if (!el) return
        const angle = (planet.startAngle + (elapsed / planet.speed) * 360) % 360
        el.setAttribute('transform', `rotate(${angle}, ${CX}, ${CY})`)
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <svg
      viewBox="0 0 900 900"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden
    >
      {/* Stars */}
      {STARS.map((star, i) => (
        <circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="white"
          opacity={star.opacity}
        />
      ))}

      {/* Orbit rings */}
      {PLANETS.map((planet) => (
        <circle
          key={`orbit-${planet.name}`}
          cx={CX}
          cy={CY}
          r={planet.orbit}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.8"
        />
      ))}

      {/* Sun glow layers */}
      <circle cx={CX} cy={CY} r={52} fill="rgba(255,180,50,0.06)" />
      <circle cx={CX} cy={CY} r={40} fill="rgba(255,180,50,0.12)" />
      <circle cx={CX} cy={CY} r={30} fill="rgba(255,195,70,0.22)" />
      {/* Sun core */}
      <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%"  stopColor="#fff4c2" />
        <stop offset="35%" stopColor="#ffcc44" />
        <stop offset="100%" stopColor="#e07b10" stopOpacity="0.85" />
      </radialGradient>
      <circle cx={CX} cy={CY} r={22} fill="url(#sunGrad)" />

      {/* Planets */}
      {PLANETS.map((planet, i) => (
        <g
          key={planet.name}
          ref={(el) => { groupRefs.current[i] = el }}
        >
          {/* Saturn rings */}
          {planet.name === 'saturn' && (
            <ellipse
              cx={CX + planet.orbit}
              cy={CY}
              rx={planet.size + 10}
              ry={planet.size * 0.38}
              fill="none"
              stroke="rgba(228,209,145,0.55)"
              strokeWidth="3.5"
            />
          )}
          <circle
            cx={CX + planet.orbit}
            cy={CY}
            r={planet.size}
            fill={planet.color}
          />
          {/* Earth atmosphere hint */}
          {planet.name === 'earth' && (
            <circle
              cx={CX + planet.orbit}
              cy={CY}
              r={planet.size + 2.5}
              fill="none"
              stroke="rgba(74,144,217,0.22)"
              strokeWidth="2.5"
            />
          )}
        </g>
      ))}
    </svg>
  )
}
