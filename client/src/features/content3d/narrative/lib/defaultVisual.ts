import type { NarrativeBeatVisual } from '@/features/content3d/narrative/types'

export const DEFAULT_NARRATIVE_VISUAL: NarrativeBeatVisual = {
  globeTint: '#c94a28',
  atmosphereColor: '#c94a28',
  atmosphereThickness: 0.1,
  waterCoverage: 0,
  dustOpacity: 0.24,
  volcanicGlow: 0,
}

export function narrativeVisualForBeatId(id: number): NarrativeBeatVisual {
  const presets: Record<number, Partial<NarrativeBeatVisual>> = {
    1: { atmosphereColor: '#4477cc', atmosphereThickness: 0.6, waterCoverage: 0.55, volcanicGlow: 0.8, globeTint: '#8b4513' },
    2: { atmosphereColor: '#5588bb', atmosphereThickness: 0.4, waterCoverage: 0.2, volcanicGlow: 0.4 },
    3: { atmosphereColor: '#5588bb', atmosphereThickness: 0.38, waterCoverage: 0.28, volcanicGlow: 0.35 },
    6: { globeTint: '#c94a28', atmosphereColor: '#dd5522', dustOpacity: 0.22 },
  }
  return { ...DEFAULT_NARRATIVE_VISUAL, ...presets[id] }
}
