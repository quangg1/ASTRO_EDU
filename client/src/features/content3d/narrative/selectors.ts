import { narrativeSpaceService } from '@/features/content3d/narrative/service'
import { EARTH_HISTORY_PRESET } from '@/features/content3d/narrative/presets/earth'

export function getNarrativeBeatByTime(time: number) {
  return narrativeSpaceService.getBeatByTime(EARTH_HISTORY_PRESET.beats, time)
}

export function getNarrativeBeatById(id: number) {
  return narrativeSpaceService.getBeatById(EARTH_HISTORY_PRESET.beats, id)
}
