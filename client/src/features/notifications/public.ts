/**
 * Public surface for in-app notifications.
 */
export {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './api/notificationsApi'
export type { AppNotification } from './api/notificationsApi'
