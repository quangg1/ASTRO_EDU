export {
  fetchOnboardingOptions,
  fetchOnboardingStatus,
  completeOnboarding,
  skipOnboarding,
} from './api/onboardingApi'
export type {
  OnboardingIntentId,
  OnboardingExperienceId,
  OnboardingTopicOption,
  OnboardingRecommendation,
  OnboardingProfile,
  OnboardingGemReward,
  OnboardingOptions,
} from './api/onboardingApi'

export { OnboardingWelcomeBanner } from './ui/OnboardingWelcomeBanner'
export { LearningStartGuide } from './ui/LearningStartGuide'
export { DashboardForYouPanel } from './ui/DashboardForYouPanel'
export { DashboardOnboardingWelcome } from './ui/DashboardOnboardingWelcome'
export { OnboardingWizard } from './ui/OnboardingWizard'
// OnboardingRedirect imports this barrel — keep it at `@/features/onboarding/ui/OnboardingRedirect`.
