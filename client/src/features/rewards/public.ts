/**
 * Rewards / gems surface for other domains (learning-path behavior, dashboard, explore).
 */
export {
  addGemTransaction,
  awardGemsForLearningPathLesson,
  GEM_REWARD_LEARNING_PATH_LESSON,
  loadGemWallet,
  saveGemWallet,
  syncGemWallet,
} from './lib/gemWallet'
export type { GemTransaction, GemWalletState } from './lib/gemWallet'
export * from './api/showcaseGamificationApi'
