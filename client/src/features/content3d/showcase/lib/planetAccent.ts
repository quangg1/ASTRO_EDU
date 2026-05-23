/**
 * Per-planet accent color for the 3D scene surface.
 *
 * Drives `--planet-accent` on the `.surface-scene` wrapper so all overlay
 * components (panels, HUD, controls) automatically retint when the user
 * focuses a different body. The semantic token chain is:
 *
 *   --planet-accent   (set inline by app/explore wrapper)
 *     └─ --color-accent (overridden by .surface-scene → var(--planet-accent))
 *         └─ Tailwind `text-ds-accent`, `border-ds-accent-strong`, …
 *
 * Colors are tuned to each body's surface dominant tone — close enough to
 * the photographic texture so the accent reads as "of that planet" without
 * fighting the canvas. Keep saturation moderate; the canvas behind is dark.
 */

/** Default accent when no body is focused (matches the showcase gold HUD). */
export const SHOWCASE_DEFAULT_ACCENT = '#f0c35d'

/** Index-aligned with `planetsData` in `lib/solarSystemData.ts`. */
const PLANET_ACCENT_BY_NAME: Record<string, string> = {
  Mercury: '#9ea0a3',
  Venus: '#e6b878',
  Earth: '#4ea1ff',
  Mars: '#d96343',
  Jupiter: '#d6a66a',
  Saturn: '#e8c170',
  Uranus: '#7fd6e5',
  Neptune: '#4d7cff',
}

/**
 * Resolve the accent for a planet by its catalog name (case-insensitive).
 * Returns the default showcase accent when the name is unknown / nullish.
 */
export function resolvePlanetAccent(planetName: string | null | undefined): string {
  if (!planetName) return SHOWCASE_DEFAULT_ACCENT
  const key = Object.keys(PLANET_ACCENT_BY_NAME).find(
    (k) => k.toLowerCase() === planetName.toLowerCase(),
  )
  return key ? PLANET_ACCENT_BY_NAME[key] : SHOWCASE_DEFAULT_ACCENT
}

/** Public read-only view (for tooling / debug panels). */
export const PLANET_ACCENT = Object.freeze({ ...PLANET_ACCENT_BY_NAME })
