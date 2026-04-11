# Hybrid Native Essentials

This document defines the native bridge strategy for deep links, push notifications, and secure token handling.

## Deep Links

- Runtime listener is initialized in `src/components/ui/HybridBootstrap.tsx`.
- Event source: `@capacitor/app` -> `appUrlOpen`.
- Behavior:
  - parse incoming URL
  - map path/query/hash
  - route inside Next app with `router.replace(...)`

## Push Notifications

- Plugin installed: `@capacitor/push-notifications`.
- MVP behavior in code:
  - `registerPushNotifications()` in `src/lib/hybrid/mobileNative.ts`
  - requests permission and registers token.
- Backend integration step (next sprint):
  - add endpoint to save push token per user device
  - create topic mapping for content alerts (course updates, reminders).

## Secure Storage Strategy

- Native secure-ish persistence path:
  - `@capacitor/preferences` as baseline token storage.
- Web path:
  - browser `localStorage`.
- Sync flow:
  - `setToken()` writes localStorage + native preferences (fire-and-forget).
  - `clearToken()` clears both storages.
  - app bootstrap hydrates native token back to localStorage for existing API clients.

## Network State

- `HybridBootstrap` listens to `@capacitor/network`.
- Online/offline status is attached to `document.body.dataset.networkStatus`.
- UI components can read this state to show connection warnings and retries.
