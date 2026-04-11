import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null

/** Phải đọc trực tiếp `process.env.NEXT_PUBLIC_*` — Next chỉ inline khi tên biến tĩnh; `process.env[key]` sẽ thành rỗng trên client. */
function trimEnv(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function isFirebaseClientConfigured(): boolean {
  const apiKey = trimEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
  const authDomain = trimEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
  const projectId = trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  return !!(apiKey && authDomain && projectId)
}

/** Khởi tạo Firebase Auth (client). Trả null nếu thiếu biến môi trường. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseClientConfigured()) return null
  if (cachedAuth) return cachedAuth
  if (!getApps().length) {
    cachedApp = initializeApp({
      apiKey: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      storageBucket: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || undefined,
      messagingSenderId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || undefined,
      appId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || undefined,
    })
  } else {
    cachedApp = getApps()[0]!
  }
  cachedAuth = getAuth(cachedApp)
  return cachedAuth
}
