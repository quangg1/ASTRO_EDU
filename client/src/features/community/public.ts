/**
 * Public surface for the community domain (forums, posts, comments, news feed).
 *
 * Consumers (`app/community/**`, `components/community/**`) import from here
 * rather than the deep `./api/communityApi` path.
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
