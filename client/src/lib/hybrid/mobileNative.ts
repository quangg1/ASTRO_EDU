import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'

const SECURE_TOKEN_KEY = 'galaxies_token'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export async function setSecureToken(token: string): Promise<void> {
  if (!isNativeApp()) return
  await Preferences.set({ key: SECURE_TOKEN_KEY, value: token })
}

export async function clearSecureToken(): Promise<void> {
  if (!isNativeApp()) return
  await Preferences.remove({ key: SECURE_TOKEN_KEY })
}

export async function hydrateTokenToLocalStorage(): Promise<void> {
  if (!isNativeApp() || typeof window === 'undefined') return
  const { value } = await Preferences.get({ key: SECURE_TOKEN_KEY })
  if (value) {
    localStorage.setItem(SECURE_TOKEN_KEY, value)
  }
}

/**
 * Request notification permission (native only) and register the device with
 * APNS / FCM so the back-end can target it.
 *
 * NOT wired into `HybridBootstrap` yet: doing so would prompt every user on
 * first launch, which is hostile UX. Call this from a deliberate opt-in flow
 * (e.g. a settings toggle, or after the user enables a feature that needs
 * push). Documented as a deferred orphan in `docs/ARCHITECTURE_AUDIT.md`
 * §3.7. The `@capacitor/push-notifications` dependency stays installed
 * because the Android Gradle wrapper already links it.
 */
export async function registerPushNotifications(): Promise<void> {
  if (!isNativeApp()) return
  const permissionStatus = await PushNotifications.requestPermissions()
  if (permissionStatus.receive !== 'granted') return
  await PushNotifications.register()
}
