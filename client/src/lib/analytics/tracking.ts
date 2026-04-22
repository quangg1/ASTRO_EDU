'use client'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export type AnalyticsEventName =
  | 'login_success'
  | 'register_success'
  | 'lesson_complete_toggled'
  | 'concept_panel_opened'
  | 'checkout_started'
  | 'payment_return_viewed'
  | 'admin_dashboard_viewed'
  | 'admin_user_role_changed'
  | 'admin_teacher_application_reviewed'
  | 'admin_range_changed'

export function trackEvent(name: AnalyticsEventName, params: Record<string, string | number | boolean | null> = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}
