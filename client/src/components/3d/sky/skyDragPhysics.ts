import type { SkyViewState } from './skyViewState'
import { applyViewDrag, clampViewAltRad, wrapViewAzRad } from './skyViewState'

export type ViewVelocity = { az: number; alt: number }

const DAMP = 0.88
const MIN_SPEED = 0.00002

export function applyViewInertia(
  view: SkyViewState,
  vel: ViewVelocity,
  dtSec: number,
): { view: SkyViewState; vel: ViewVelocity } {
  if (Math.abs(vel.az) < MIN_SPEED && Math.abs(vel.alt) < MIN_SPEED) {
    return { view, vel: { az: 0, alt: 0 } }
  }
  const next = {
    viewAzRad: wrapViewAzRad(view.viewAzRad - vel.az * dtSec),
    viewAltRad: clampViewAltRad(view.viewAltRad + vel.alt * dtSec),
  }
  return {
    view: next,
    vel: { az: vel.az * DAMP, alt: vel.alt * DAMP },
  }
}

export function velocityFromDrag(dx: number, dy: number, sensitivity = 0.005): ViewVelocity {
  return {
    az: dx * sensitivity * 18,
    alt: -dy * sensitivity * 18,
  }
}

export function mergeDragIntoView(
  view: SkyViewState,
  dx: number,
  dy: number,
  sensitivity = 0.005,
): SkyViewState {
  return applyViewDrag(view, dx, dy, sensitivity)
}
