import { trackLearningPathBehavior } from '@/features/learning-path/public'
import { markPassportStoryTourCompleted } from '@/features/explore/lib/explorePassportStorage'

export function dispatchExplorePassportChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('explore-passport-changed'))
}

export function completeStoryTour(args: {
  userId?: string | null
  storyId: string
  storyTitle?: string
  unlockEntityId?: string
}) {
  const storyId = String(args.storyId || '').trim()
  if (!storyId) return
  markPassportStoryTourCompleted(args.userId ?? null, storyId)
  trackLearningPathBehavior({
    eventName: 'story_tour_completed',
    metadata: {
      schemaVersion: 'story_tour_v1',
      storyId,
      storyTitle: args.storyTitle || '',
      unlockEntityId: args.unlockEntityId || '',
    },
  })
  dispatchExplorePassportChanged()
}
