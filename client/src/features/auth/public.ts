/**
 * Public surface for the auth domain — other features import from here only
 * (not `./api/*` deep paths).
 *
 * Three groups:
 *   1. Token + session helpers (sync, no fetch).
 *   2. Self-service auth actions (login/register/profile/password).
 *   3. User-facing teacher-application actions (admin-side ones live in
 *      `features/admin/public`).
 *
 * @see DOMAIN_MAP.md §3 (cross-domain import rule)
 */

// 1. Token + identity (sync helpers + store) -----------------------------------
export {
  getToken,
  setToken,
  clearToken,
  getUserFromStoredToken,
} from './api/authApi'
export type { AuthUser, AuthResponse } from './api/authApi'
export { useAuthStore } from './stores/useAuthStore'

// 2. Self-service auth actions -------------------------------------------------
// Note: app/{login,register,forgot-password,reset-password,auth/callback} still
// import these from `./api/authApi` directly — DOMAIN_MAP §3 allows that for
// auth pages. The re-exports below let cross-domain consumers (e.g. profile,
// AppHeader) avoid deep imports.
export {
  login,
  register,
  verifyRegistrationEmail,
  resendRegistrationVerification,
  fetchMe,
  loginWithFirebaseIdToken,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deactivateMyAccount,
} from './api/authApi'
export type { RegisterStartResponse } from './api/authApi'

// 3. Teacher-application — user-facing side ------------------------------------
// Admin-side review APIs live in `features/admin/public` to keep the audience
// boundary explicit.
export {
  submitTeacherApplication,
  fetchMyTeacherApplicationStatus,
  markTeacherApplicationCvReviewed,
} from './api/teacherApplicationsApi'
export type {
  TeacherApplication,
  TeacherApplicationWithUser,
  TeacherApplicationSubmitBody,
} from './api/teacherApplicationsApi'
export {
  uploadTeacherApplicationCv,
  uploadTeacherApplicationCertificate,
  uploadAvatarForApplication,
} from './api/teacherApplicationMediaApi'
export {
  fetchMyTeacherProfile,
  updateMyTeacherProfile,
} from './api/teacherProfileApi'
export type { PublicTeacherProfile } from './api/teacherProfileApi'
export { uploadProfileAvatar } from './api/avatarUploadApi'
export type { AvatarUploadResult } from './api/avatarUploadApi'
