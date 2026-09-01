const { AppError } = require('../../../shared/errors');
const forumRepository = require('../repositories/forumRepository');
const postRepository = require('../repositories/postRepository');
const { isNewsForum } = require('../constants/forumCatalog');
const { buildForumPostFilter } = require('../lib/postListQuery');
const { mergePostTags } = require('../lib/postTags');
const { assertCohortForumAccess } = require('../lib/cohortForumGate');
const { maybeRewardCommunityPost } = require('./communityGemService');
const { mapMyVotes } = require('./voteService');
const { enrichPostsWithAuthors } = require('../../users/publicProfileService');
const presenter = require('../presenters/communityPresenter');

/** Forum lớp học bị chặn ở đây, nên mọi đường vào đều đi qua hàm này. */
async function loadAccessibleForum(slug, viewer) {
  const forum = await forumRepository.findBySlug(slug);
  if (!forum) throw AppError.notFound('Không tìm thấy diễn đàn');
  await assertCohortForumAccess(forum, viewer.userId, viewer.role);
  return forum;
}

function listPublicForums() {
  return forumRepository.listPublic();
}

async function getForum({ slug, viewer }) {
  return presenter.forumDetail(await loadAccessibleForum(slug, viewer));
}

async function listForumPosts({ slug, viewer, query }) {
  const forum = await loadAccessibleForum(slug, viewer);
  const { page, limit, sort } = query;
  const filter = buildForumPostFilter(forum, query, viewer.role, viewer.doc);

  const [posts, total] = await Promise.all([
    postRepository.listPage(filter, { sort, skip: (page - 1) * limit, limit }),
    postRepository.count(filter),
  ]);

  const enriched = await enrichPostsWithAuthors(posts);
  const voteMap = viewer.userId && enriched.length
    ? await mapMyVotes(viewer.userId, 'post', enriched.map((post) => post._id))
    : null;

  return { data: presenter.withMyVotes(enriched, voteMap), total, page, limit };
}

async function createForumPost({ slug, viewer, input }) {
  const forum = await loadAccessibleForum(slug, viewer);
  if (isNewsForum(forum)) {
    throw AppError.badRequest('Không thể đăng bài vào kênh tin tổng hợp');
  }

  const post = await postRepository.create({
    forumId: forum._id,
    authorId: viewer.userId,
    authorName: viewer.displayName,
    title: input.title,
    content: input.content,
    courseId: input.courseId,
    courseSlug: input.courseSlug,
    lessonSlug: input.lessonSlug,
    pathSource: input.pathSource,
    contextTitle: input.contextTitle,
    learningModuleId: input.learningModuleId,
    learningNodeId: input.learningNodeId,
    learningLessonId: input.learningLessonId,
    tags: mergePostTags({
      explicitTags: input.tags,
      title: input.title,
      content: input.content,
    }),
  });

  await forumRepository.incrementPostCount(forum._id, 1);

  const created = post.toObject();
  const [enriched] = await enrichPostsWithAuthors([created]);

  // Thưởng gem không được phép làm hỏng việc đăng bài.
  let gemReward = null;
  try {
    gemReward = await maybeRewardCommunityPost({ userId: viewer.userId, post: created, forum });
  } catch (err) {
    console.error('Community post gem reward error:', err);
  }

  indexPostForSearch(created);

  return { post: enriched, gemReward };
}

/** Đánh chỉ mục RAG chạy sau khi đã trả lời client — lỗi ở đây không chặn request. */
function indexPostForSearch(post) {
  setImmediate(() => {
    const { appendCommunityPostChunk } = require('../../agent/services/ragIndexService');
    appendCommunityPostChunk(post).catch((err) => {
      console.warn('[ragIndex] post create index:', err.message);
    });
  });
}

module.exports = {
  loadAccessibleForum,
  listPublicForums,
  getForum,
  listForumPosts,
  createForumPost,
};
