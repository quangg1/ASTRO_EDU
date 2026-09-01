const Forum = require('../models/Forum');
const Post = require('../models/Post');
const forumRepository = require('../repositories/forumRepository');
const {
  NEWS_FORUM_SLUG,
  DISCUSSION_FORUMS,
  ALLOWED_FORUM_SLUGS,
} = require('../constants/forumCatalog');

function cohortForumSlug(cohortId) {
  return `cohort-${String(cohortId)}`;
}

/** API công khai: lớp học nhờ community tạo diễn đàn riêng, không chạm model Forum. */
async function ensureCohortForum({ cohort, course }) {
  const slug = cohortForumSlug(cohort._id);
  let forum = await forumRepository.findOne({ cohortId: cohort._id });
  if (!forum) {
    const created = await forumRepository.create({
      slug,
      title: `${cohort.title} — Thảo luận`,
      description: `Diễn đàn riêng lớp «${cohort.title}» — khóa «${course.title}».`,
      icon: '💬',
      order: 9000,
      cohortId: cohort._id,
      courseId: course._id,
    });
    forum = created.toObject ? created.toObject() : created;
  }
  return {
    slug: forum.slug,
    title: forum.title,
    description: forum.description,
    cohortId: String(forum.cohortId || cohort._id),
  };
}

async function ensureNewsForumRecord() {
  let forum = await Forum.findOne({ slug: NEWS_FORUM_SLUG }).lean();
  if (!forum) {
    forum = await Forum.create({
      slug: NEWS_FORUM_SLUG,
      title: 'Tin thiên văn',
      description: 'Tin tức thiên văn — tổng hợp từ các nguồn uy tín (RSS).',
      icon: '🌌',
      order: 0,
      isNews: true,
    });
    return forum.toObject ? forum.toObject() : forum;
  }
  if (!forum.isNews) {
    await Forum.updateOne({ _id: forum._id }, { $set: { isNews: true } });
  }
  return forum;
}

/**
 * Đồng bộ forum: giữ tin-thien-van + 5 mục thảo luận; xóa forum cũ và bài trong đó.
 */
async function bootstrapCommunityForums() {
  await ensureNewsForumRecord();

  for (const def of DISCUSSION_FORUMS) {
    await Forum.findOneAndUpdate(
      { slug: def.slug },
      {
        $set: {
          title: def.title,
          description: def.description,
          icon: def.icon,
          order: def.order,
          isNews: false,
        },
        $setOnInsert: { slug: def.slug, postCount: 0 },
      },
      { upsert: true, new: true },
    );
  }

  const stale = await Forum.find({ slug: { $nin: [...ALLOWED_FORUM_SLUGS] } }).lean();
  let removedForums = 0;
  let removedPosts = 0;
  for (const f of stale) {
    const del = await Post.deleteMany({ forumId: f._id });
    removedPosts += del.deletedCount || 0;
    await Forum.deleteOne({ _id: f._id });
    removedForums += 1;
  }

  return { removedForums, removedPosts, allowed: [...ALLOWED_FORUM_SLUGS] };
}

module.exports = {
  ensureNewsForumRecord,
  bootstrapCommunityForums,
  cohortForumSlug,
  ensureCohortForum,
};
