'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchOnboardingStatus,
  type OnboardingIntentId,
} from '@/features/onboarding/public'
import { loadEduJourneyContext, type EduJourneyContext } from '@/lib/eduJourney'
import { useLearningPath } from './useLearningPath'
import {
  loadLastLearningPathLessonId,
  loadLessonCompletion,
  syncLearningPathCompletion,
  type LessonCompletionMap,
} from '../lib/learningPathProgress'
import {
  resolveLearnerNextAction,
  type LearnerNextAction,
} from '../lib/resolveLearnerNextAction'

export function useLearnerNextAction(): {
  nextAction: LearnerNextAction
  loading: boolean
  intent: OnboardingIntentId | null
  eduJourney: EduJourneyContext | null
  refresh: () => void
} {
  const { user } = useAuthStore()
  const userId = user?.id ?? null
  const { modules } = useLearningPath()
  const [completionMap, setCompletionMap] = useState<LessonCompletionMap>({})
  const [lastLessonId, setLastLessonId] = useState<string | null>(null)
  const [intent, setIntent] = useState<OnboardingIntentId | null>(null)
  const [primaryHref, setPrimaryHref] = useState<string | null>(null)
  const [eduJourney, setEduJourney] = useState<EduJourneyContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = () => setTick((n) => n + 1)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setEduJourney(loadEduJourneyContext())
    const local = loadLessonCompletion(userId)
    setCompletionMap(local)
    setLastLessonId(loadLastLearningPathLessonId(userId))
    setLoading(true)
    void syncLearningPathCompletion(userId).then((synced) => {
      setCompletionMap(synced)
      setLastLessonId(loadLastLearningPathLessonId(userId))
      setLoading(false)
    })
  }, [userId, modules, tick])

  useEffect(() => {
    if (!user) {
      setIntent(null)
      setPrimaryHref(null)
      return
    }
    let cancelled = false
    void fetchOnboardingStatus().then((s) => {
      if (cancelled || !s?.profile?.completed) return
      setIntent(s.profile.primaryIntent ?? null)
      setPrimaryHref(s.profile.primaryHref ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [user, tick])

  const nextAction = useMemo(
    () =>
      resolveLearnerNextAction({
        modules,
        completionMap,
        lastLessonId,
        intent,
        primaryHref,
        eduJourney,
      }),
    [modules, completionMap, lastLessonId, intent, primaryHref, eduJourney],
  )

  return { nextAction, loading, intent, eduJourney, refresh }
}
