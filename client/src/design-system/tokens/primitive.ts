/**
 * Layer 1 — Primitive design tokens (raw scales, no semantic meaning).
 *
 * Source of truth for spacing / radius / motion scales used by the design system.
 * Color values live in `semantic.css` as CSS variables so surfaces can override
 * them without touching JS.
 *
 * Reference these from JS only when CSS variables can't reach (e.g. canvas,
 * three.js, inline styles for chart libraries).
 */

export const space = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const

export const duration = {
  instant: '0ms',
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  slower: '500ms',
} as const

export const easing = {
  /** Default easing — matches `--motion-easing`. */
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  emphasized: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
} as const

export type SpaceKey = keyof typeof space
export type RadiusKey = keyof typeof radius
export type DurationKey = keyof typeof duration
export type EasingKey = keyof typeof easing
