/**
 * Public surface for direct messages (app routes import from here only).
 */
export {
  fetchConversations,
  fetchConversationMessages,
  openConversationWithUser,
  sendDirectMessage,
} from './api/messagesApi'
export type { DmConversationSummary, DmMessage } from './api/messagesApi'
export { useDmRealtime } from './hooks/useDmRealtime'
export type { DmRealtimeEvent } from './hooks/useDmRealtime'
