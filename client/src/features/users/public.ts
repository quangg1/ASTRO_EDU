export { fetchPublicUserProfile } from './api/publicProfileApi'
export type { PublicUserProfile } from './api/publicProfileApi'
export {
  fetchMyLearnerProfile,
  updateMyLearnerProfile,
} from './api/learnerProfileApi'
export type { EducationEntry, LearnerProfile } from './api/learnerProfileApi'

// UI leaves (avoid modules that import this barrel)
export { AvatarWithDecoration } from './ui/AvatarWithDecoration'
export { LearnerTierBadge } from './ui/LearnerTierBadge'
export { UserProfileLink } from './ui/UserProfileLink'
export { DecorationCategoryBanner } from './ui/DecorationCategoryBanner'
export { DecorationOverlayThumb } from './ui/DecorationOverlayThumb'
export { TeacherProfileEditor } from './ui/TeacherProfileEditor'
export { LearnerProfileEditor } from './ui/LearnerProfileEditor'
export { AvatarDecorationPicker } from './ui/AvatarDecorationPicker'
