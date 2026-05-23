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
  fetchPost,
  createPost,
  addComment,
  votePost,
  pinPost,
  deletePost,
} from './api/communityApi'
export type {
  Forum,
  Post,
  Comment,
} from './api/communityApi'

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
