/**
 * Public surface for the community domain (forums, posts, comments, news feed).
 *
 * Consumers (`app/community/**`, other features) import from here rather than
 * deep `./api/*` or `./ui/*` paths when a stable export exists.
 *
 * @see DOMAIN_MAP.md §3
 */
export {
  fetchForums,
  fetchForum,
  fetchForumPosts,
  fetchNews,
  fetchNewsCategories,
  fetchPopularTags,
  searchCommunityPosts,
  fetchPostsByTag,
  fetchPost,
  createPost,
  addComment,
  votePost,
  voteComment,
  markCommentHelpful,
  pinPost,
  deletePost,
} from './api/communityApi'
export type {
  Forum,
  Post,
  Comment,
  CommunityTagCount,
  CommunityGemReward,
} from './api/communityApi'

export {
  isNewsForum,
  NEWS_FORUM_SLUG,
  composeForumUrl,
  DEFAULT_COURSE_QUESTION_FORUM,
} from './lib/forumKinds'

export {
  parseComposeContext,
  buildContextTitle,
  suggestPostTitle,
  composeContextToParams,
  learningContextBackHref,
  postLearningBackHref,
  createPostBodyFromContext,
} from './lib/composeContext'
export type { ComposeLearningContext, PathSource } from './lib/composeContext'

// Community-only helpers (HTML excerpt, thumbnails, engagement dedupe) — PR10
export {
  firstImageSrcFromHtml,
  stripFirstImgTag,
  isHtmlFragmentEmpty,
  looksLikeHtml,
  postThumbnailUrl,
  newsPostHref,
  newsPostOpensNewTab,
  plainTextExcerpt,
} from './lib/postContent'
export {
  recordPostDetailView,
  recordPostSourceOpen,
} from './lib/postEngagement'

export { syncCommunityGemReward } from './lib/communityGemReward'

export {
  submitCommunityReport,
  fetchModerationQueue,
  resolveModerationReport,
  issueModerationWarning,
  setPostHidden,
  setCommentHidden,
  deleteCommentAsMod,
  REPORT_REASON_LABELS,
} from './api/moderationApi'
export type { ReportReason, ModerationQueueItem } from './api/moderationApi'

// UI lives in `./ui/*`. Only re-export leaves that do not import this barrel.
export { CommunityAskButton } from './ui/learning/CommunityAskButton'
export { LessonRelatedQuestions } from './ui/learning/LessonRelatedQuestions'
export { NewsTopicChips } from './ui/NewsTopicChips'
export { PostMarkdown } from './ui/PostMarkdown'
export { NewsHeroSlider } from './ui/NewsHeroSlider'
export { NewsHotRow } from './ui/NewsHotRow'
export { NewsCardLink } from './ui/NewsCardLink'
export { CommunitySearchBar } from './ui/shared/CommunitySearchBar'
export { PostSortBar } from './ui/shared/PostSortBar'
export { DiscussionPostList } from './ui/discussion/DiscussionPostList'
export { CommentThread } from './ui/comments/CommentThread'
export { ModerationQueuePanel } from './ui/moderation/ModerationQueuePanel'
