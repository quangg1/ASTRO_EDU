/**
 * Public surface for promotions (active campaigns, course banners).
 */
export { fetchActivePromotions, fetchCoursePromoBanner, validatePromoCode } from './api/promoApi'
export type { ActivePromoCampaign, CoursePromoBanner } from './api/promoApi'
export { dismissPromo, undismissedPromos } from './lib/promoDismiss'
export { PromoCampaignBar } from './ui/PromoCampaignBar'
export { PromoNotificationsSection } from './ui/PromoNotificationsSection'
