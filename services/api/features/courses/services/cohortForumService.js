const Forum = require('../../community/models/Forum');

function cohortForumSlug(cohortId) {
  return `cohort-${String(cohortId)}`;
}

async function ensureCohortForum({ cohort, course }) {
  const slug = cohortForumSlug(cohort._id);
  let forum = await Forum.findOne({ cohortId: cohort._id }).lean();
  if (!forum) {
    const created = await Forum.create({
      slug,
      title: `${cohort.title} — Thảo luận`,
      description: `Diễn đàn riêng lớp «${cohort.title}» — khóa «${course.title}».`,
      icon: '💬',
      order: 9000,
      cohortId: cohort._id,
      courseId: course._id,
    });
    forum = created.toObject();
  }
  return {
    slug: forum.slug,
    title: forum.title,
    description: forum.description,
    cohortId: String(forum.cohortId || cohort._id),
  };
}

module.exports = { cohortForumSlug, ensureCohortForum };
