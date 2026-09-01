'use client'

import { LearningStartGuide } from '@/features/onboarding/public'

/** Client wrapper — eduJourney / next-action chỉ đọc được trên client. */
export function TutorialJourneyGuide() {
  return <LearningStartGuide primaryOnly hideKnowledgeMap context="tutorial" />
}
