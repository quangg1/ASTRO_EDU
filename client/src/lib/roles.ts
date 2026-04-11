import type { AuthUser } from './authApi'

export const ROLES = ['student', 'teacher', 'moderator', 'admin'] as const
export type UserRole = (typeof ROLES)[number]

/** Có quyền tạo/sửa tutorial, course, upload media (teacher hoặc admin) */
export function canEditContent(user: AuthUser | null): boolean {
  return user?.role === 'teacher' || user?.role === 'admin'
}

/** Có quyền quản lý user, đổi role, moderation (admin) */
export function canManageUsers(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

/** Có quyền moderation: ghim/xóa post (admin hoặc moderator) */
export function canModerate(user: AuthUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'moderator'
}
