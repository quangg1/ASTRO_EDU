'use client'

import { useCallback, useMemo, useState } from 'react'
import { useEffect } from 'react'
import {
  loadCompletedMilestoneIds,
  saveCompletedMilestoneIds,
  syncSolarJourneyProgress,
  pushSolarJourneyProgress,
} from '@/lib/solarJourneyProgress'
import { useAuthStore } from '@/store/useAuthStore'

export function useSolarJourneyProgress() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompletedMilestoneIds(userId))

  useEffect(() => {
    setCompleted(loadCompletedMilestoneIds(userId))
    void syncSolarJourneyProgress(userId).then((synced) => setCompleted(new Set(synced)))
  }, [userId])

  const markComplete = useCallback((milestoneId: string) => {
    setCompleted((prev) => {
      if (prev.has(milestoneId)) return prev
      const next = new Set(prev)
      next.add(milestoneId)
      saveCompletedMilestoneIds(next, userId)
      void pushSolarJourneyProgress(next, userId)
      return next
    })
  }, [userId])

  const isComplete = useCallback((milestoneId: string) => completed.has(milestoneId), [completed])

  const progressForLeg = useCallback(
    (milestoneIds: string[]) => {
      const done = milestoneIds.filter((id) => completed.has(id)).length
      return { done, total: milestoneIds.length, ratio: milestoneIds.length ? done / milestoneIds.length : 0 }
    },
    [completed]
  )

  const stats = useMemo(() => ({ count: completed.size }), [completed])

  return { completed, markComplete, isComplete, progressForLeg, stats }
}
