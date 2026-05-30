'use client'

import { createContext, useContext, useEffect } from 'react'
import type { DepthLevel } from '@/data/learningPathCurriculum'
import type { LearnerSnapshot, SessionContext } from '../types'
import { useAgentPageContextStore } from '../stores/useAgentPageContextStore'

export type AgentPageContextValue = {
  sessionContext: SessionContext
  learnerSnapshot?: LearnerSnapshot
  onSuggestDepth?: (depth: DepthLevel, reason: string) => void
}

const AgentPageContext = createContext<AgentPageContextValue | null>(null)

export function AgentPageProvider({
  value,
  children,
}: {
  value: AgentPageContextValue
  children: React.ReactNode
}) {
  const setPageContext = useAgentPageContextStore((s) => s.setPageContext)

  useEffect(() => {
    setPageContext(value)
    return () => setPageContext(null)
  }, [value, setPageContext])

  return <AgentPageContext.Provider value={value}>{children}</AgentPageContext.Provider>
}

export function useAgentPageContext(): AgentPageContextValue | null {
  return useContext(AgentPageContext)
}
