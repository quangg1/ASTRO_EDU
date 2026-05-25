import type { AuthUser } from '@/features/auth/public'

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
  return isAdmin(user)
}

export function canManagePlatform(user: AuthUser | null): boolean {
  return isAdmin(user)
}

/** Kiểm duyệt diễn đàn — chỉ moderator */
export function canModerate(user: AuthUser | null): boolean {
  return isModerator(user)
}

/** Admin can thiệp khẩn cấp (ẩn bài, xóa) khi cần */
export function canModerateOrAdminOverride(user: AuthUser | null): boolean {
  return isModerator(user) || isAdmin(user)
}
