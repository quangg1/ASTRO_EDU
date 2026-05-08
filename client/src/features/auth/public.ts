/**
 * Public surface for the auth domain — other features import from here only (not `./api/*` deep paths).
 * @see DOMAIN_MAP.md
 */
export { getToken, getUserFromStoredToken, setToken, clearToken } from './api/authApi'
export type { AuthUser, AuthResponse } from './api/authApi'
export { useAuthStore } from './stores/useAuthStore'
