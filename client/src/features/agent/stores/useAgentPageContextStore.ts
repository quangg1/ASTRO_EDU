import { create } from 'zustand'
import type { AgentPageContextValue } from '../context/AgentPageContext'

/** Bridge context từ trang LP/Explore (trong cây React) → widget portal ở layout. */
interface AgentPageContextStore {
  pageContext: AgentPageContextValue | null
  setPageContext: (value: AgentPageContextValue | null) => void
}

export const useAgentPageContextStore = create<AgentPageContextStore>((set) => ({
  pageContext: null,
  setPageContext: (pageContext) => set({ pageContext }),
}))
