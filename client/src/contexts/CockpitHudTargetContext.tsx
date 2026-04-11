'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Vùng pixel của khung “hành tinh” (viewport) — dùng để căn canvas fixed với đúng ô. */
export type PlanetFrameRect = {
  left: number
  top: number
  width: number
  height: number
}

/** Tâm vùng khung (0–1 theo canvas WebGL) — fallback khi fullscreen + chưa có rect. */
export type CockpitHudTargetState = {
  canvasCenterX: number
  canvasCenterY: number
  valid: boolean
  planetFrameRect: PlanetFrameRect | null
}

const defaultState: CockpitHudTargetState = {
  canvasCenterX: 0.5,
  canvasCenterY: 0.5,
  valid: false,
  planetFrameRect: null,
}

type Ctx = {
  target: CockpitHudTargetState
  setTarget: (t: Partial<CockpitHudTargetState>) => void
}

const CockpitHudTargetContext = createContext<Ctx | null>(null)

function sameRect(a: PlanetFrameRect | null, b: PlanetFrameRect | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return (
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

function sameTarget(a: CockpitHudTargetState, b: CockpitHudTargetState): boolean {
  return (
    a.valid === b.valid &&
    Math.abs(a.canvasCenterX - b.canvasCenterX) < 1e-5 &&
    Math.abs(a.canvasCenterY - b.canvasCenterY) < 1e-5 &&
    sameRect(a.planetFrameRect, b.planetFrameRect)
  )
}

export function CockpitHudTargetProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState<CockpitHudTargetState>(defaultState)
  const setTarget = useCallback((t: Partial<CockpitHudTargetState>) => {
    setTargetState((s) => {
      const next: CockpitHudTargetState = { ...s, ...t }
      if (next.valid === false) next.planetFrameRect = null
      if (sameTarget(s, next)) return s
      return next
    })
  }, [])
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget])
  return <CockpitHudTargetContext.Provider value={value}>{children}</CockpitHudTargetContext.Provider>
}

export function useCockpitHudTarget() {
  return useContext(CockpitHudTargetContext)
}
