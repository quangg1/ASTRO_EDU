/**
 * Public surface for promotions (active campaigns, course banners).
 */
export { fetchActivePromotions } from './api/promoApi'
export type { ActivePromoCampaign, CoursePromoBanner } from './api/promoApi'
export { dismissPromo, undismissedPromos } from './lib/promoDismiss'
