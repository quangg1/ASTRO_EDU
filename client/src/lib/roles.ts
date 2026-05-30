import type { AuthUser } from '@/features/auth/public'
import { adminScopeForPath, type AdminScope } from '@/features/admin/lib/adminLabelsVi'

export const ROLES = ['student', 'teacher', 'moderator', 'admin'] as const
export type UserRole = (typeof ROLES)[number]

/** Giáo viên — tạo/sửa nội dung thuộc phạm vi được gán (API kiểm tra ownership). */
export function isTeacher(user: AuthUser | null): boolean {
  return user?.role === 'teacher'
}

/** Admin — vận hành hệ thống (user, tiền, cấu hình). */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

/** Admin toàn quyền — không giới hạn phạm vi con. */
export function isFullAdmin(user: AuthUser | null): boolean {
  if (!isAdmin(user)) return false
  const scopes = user?.adminScopes
  if (!scopes?.length) return true
  return scopes.includes('*')
}

/** Admin có quyền trong phạm vi cụ thể (hoặc toàn quyền). */
export function hasAdminScope(user: AuthUser | null, scope: AdminScope): boolean {
  if (!isAdmin(user)) return false
  if (isFullAdmin(user)) return true
  return (user?.adminScopes || []).includes(scope)
}

/** Vào khu vực /admin — cần role admin. */
export function canAccessAdmin(user: AuthUser | null): boolean {
  return isAdmin(user)
}

/** Kiểm tra quyền theo đường dẫn trang admin. */
export function canAccessAdminPath(user: AuthUser | null, pathname: string): boolean {
  if (!canAccessAdmin(user)) return false
  const scope = adminScopeForPath(pathname)
  if (!scope) return true
  return hasAdminScope(user, scope)
}

/** Moderator — chỉ diễn đàn (hàng đợi, cảnh báo, ẩn/xóa). */
export function isModerator(user: AuthUser | null): boolean {
  return user?.role === 'moderator'
}

/** Studio / editor: teacher thường ngày; admin chỉ khi override. */
export function canAccessStudio(user: AuthUser | null): boolean {
  return isTeacher(user)
}

export function canAdminContentOverride(user: AuthUser | null): boolean {
  return isAdmin(user)
}

/** Vào Studio: teacher hoặc admin override. */
export function canEnterStudio(user: AuthUser | null): boolean {
  return canAccessStudio(user) || canAdminContentOverride(user)
}

/** @deprecated Dùng canEnterStudio — giữ tương thích ngắn hạn */
export function canEditContent(user: AuthUser | null): boolean {
  return canEnterStudio(user)
}

export function canManageUsers(user: AuthUser | null): boolean {
  return hasAdminScope(user, 'users')
}

/** @deprecated Dùng hasAdminScope — giữ tương thích: bất kỳ admin nào cũng pass. */
export function canManagePlatform(user: AuthUser | null): boolean {
  return isAdmin(user)
}

/** Kiểm duyệt diễn đàn — chỉ moderator */
export function canModerate(user: AuthUser | null): boolean {
  return isModerator(user)
}

/** Admin can thiệp khẩn cấp (ẩn bài, xóa) khi có phạm vi moderation hoặc là moderator */
export function canModerateOrAdminOverride(user: AuthUser | null): boolean {
  return isModerator(user) || hasAdminScope(user, 'moderation')
}
