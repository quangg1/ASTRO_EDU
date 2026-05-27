export type { SessionContext, LearnerSnapshot, AgentMessageResponse } from './types'
export { AgentPageProvider, useAgentPageContext } from './context/AgentPageContext'
export type { AgentPageContextValue } from './context/AgentPageContext'
export { CosmoAssistantWidget } from '@/components/ai-tutor/CosmoAssistantWidget'
export { openCosmoAssistant } from './lib/openCosmoAssistant'
export type { OpenCosmoAssistantDetail } from './lib/openCosmoAssistant'
export { useCosmoAssistantChat } from './hooks/useCosmoAssistantChat'
export { AgentCoachBanner } from './ui/AgentCoachBanner'
export { AgentChips } from './ui/AgentChips'
export { useAgentCoach } from './hooks/useAgentCoach'
export type { AgentChip } from './ui/AgentChips'
export type { AgentStreamEvent } from './api/agentApi'
export { buildSessionContext } from './lib/buildSessionContext'
export {
  postAgentMessage,
  prefetchAgentContext,
  fetchAgentSnapshot,
  fetchAgentCoachNudge,
  fetchSpacedReviewDue,
  dismissAgentCoach,
  postAgentQuizOutcome,
  postAgentSessionSummary,
  postSpacedReviewComplete,
  postDepthPreference,
  getAgentApiBase,
} from './api/agentApi'
export {
  executeAgentClientAction,
  mergeAgentToolCalls,
  toolResultsToTutorActions,
} from './lib/executeToolCall'
