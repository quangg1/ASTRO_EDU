'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  dismissAgentCoach,
  fetchAgentCoachNudge,
  fetchAgentSnapshot,
  postAgentQuizOutcome,
  postAgentSessionSummary,
} from '../api/agentApi'
import type { LearnerSnapshot } from '../types'

export type CoachNudge = {
  allowed: boolean
  message?: string
  chips?: Array<{ label: string; action: string; lessonId?: string }>
  reason?: string
}

export function useAgentCoach(params: {
  lessonId: string
  lessonTitle: string
  sessionId?: string
  enabled?: boolean
}) {
  const { lessonId, lessonTitle, sessionId, enabled = true } = params
  const [nudge, setNudge] = useState<CoachNudge | null>(null)
  const [snapshot, setSnapshot] = useState<LearnerSnapshot | null>(null)
  const messageCountRef = useRef(0)
  const agentSessionIdRef = useRef<string | undefined>(sessionId)

  useEffect(() => {
    const onSession = (e: Event) => {
      const sid = (e as CustomEvent<{ sessionId?: string }>).detail?.sessionId
      if (sid) agentSessionIdRef.current = sid
    }
    window.addEventListener('galaxies:agent-session', onSession)
    return () => window.removeEventListener('galaxies:agent-session', onSession)
  }, [])

  useEffect(() => {
    if (!enabled) return
    void fetchAgentSnapshot().then(setSnapshot)
  }, [enabled, lessonId])

  useEffect(() => {
    if (!enabled) return
    return () => {
      const sid = agentSessionIdRef.current || sessionId
      if (sid) {
        void postAgentSessionSummary({
          sessionId: sid,
          lessonId,
          lessonTitle,
          messageCount: messageCountRef.current,
        })
      }
    }
  }, [enabled, lessonId, lessonTitle, sessionId])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetchAgentCoachNudge({ lessonId, sessionId }).then((res) => {
      if (!cancelled && res?.allowed) setNudge(res)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, lessonId, sessionId])

  const dismiss = useCallback(async () => {
    setNudge(null)
    await dismissAgentCoach()
  }, [])

  const reportQuizFailed = useCallback(
    async (misconceptionTag?: string) => {
      await postAgentQuizOutcome({ lessonId, passed: false, misconceptionTag })
      const res = await fetchAgentCoachNudge({ lessonId, sessionId })
      if (res?.allowed) setNudge(res)
    },
    [lessonId, sessionId],
  )

  const reportQuizPassed = useCallback(async () => {
    await postAgentQuizOutcome({ lessonId, passed: true })
  }, [lessonId])

  const bumpMessageCount = useCallback(() => {
    messageCountRef.current += 1
  }, [])

  const flushSessionSummary = useCallback(
    async (sid: string | undefined) => {
      if (!sid) return
      await postAgentSessionSummary({
        sessionId: sid,
        lessonId,
        lessonTitle,
        messageCount: messageCountRef.current,
      })
    },
    [lessonId, lessonTitle],
  )

  return {
    nudge,
    snapshot,
    dismiss,
    reportQuizFailed,
    reportQuizPassed,
    bumpMessageCount,
    flushSessionSummary,
    openAgent: (prompt?: string) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('galaxies:agent-open', {
            detail: prompt ? { prompt } : undefined,
          }),
        )
      }
    },
  }
}
