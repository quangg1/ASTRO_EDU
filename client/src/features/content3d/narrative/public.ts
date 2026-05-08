/**
 * Narrative space runtime + editor-facing API consumers outside this folder.
 */
export { useNarrativeStore } from '@/features/content3d/narrative/store'
export { useNarrativeSpace } from '@/features/content3d/narrative/hooks'
export { EARTH_HISTORY_PRESET } from '@/features/content3d/narrative/presets/earth'
export type { NarrativeBeat, NarrativeSpace } from '@/features/content3d/narrative/types'
export * from '@/features/content3d/narrative/api/narrativeSpacesApi'
