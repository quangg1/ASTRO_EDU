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

export async function registerPushNotifications(): Promise<void> {
  if (!isNativeApp()) return
  const permissionStatus = await PushNotifications.requestPermissions()
  if (permissionStatus.receive !== 'granted') return
  await PushNotifications.register()
}
