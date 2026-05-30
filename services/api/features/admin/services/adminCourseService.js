const Course = require('../../courses/models/Course');
const User = require('../../auth/models/User');
const { AppError } = require('../../../shared/errors');
const { recordAdminAction } = require('../lib/recordAdminAction');

async function listAdminCourses({ q = '', published, page = 1, limit = 30 }) {
  const filter = {};
  if (published === 'true') filter.published = true;
  if (published === 'false') filter.published = false;
  if (q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ slug: rx }, { title: rx }];
  }

  const skip = Math.max(0, (Math.max(1, page) - 1) * Math.min(100, limit));
  const take = Math.min(100, Math.max(1, limit));

  const [items, total] = await Promise.all([
    Course.find(filter)
      .select('title slug published price currency isPaid teacherId createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    Course.countDocuments(filter),
  ]);

  const ownerIds = [...new Set(items.map((c) => c.teacherId).filter(Boolean))];
  const owners = ownerIds.length
    ? await User.find({ _id: { $in: ownerIds } })
        .select('email displayName')
        .lean()
    : [];
  const ownerById = Object.fromEntries(owners.map((u) => [String(u._id), u]));

  return {
    items: items.map((c) => ({
      id: String(c._id),
      title: c.title,
      slug: c.slug,
      published: Boolean(c.published),
      price: c.price ?? 0,
      currency: c.currency || 'VND',
      isPaid: Boolean(c.isPaid),
      ownerId: c.teacherId ? String(c.teacherId) : null,
      ownerEmail: c.teacherId ? ownerById[String(c.teacherId)]?.email || null : null,
      ownerName: c.teacherId ? ownerById[String(c.teacherId)]?.displayName || null : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page: Math.max(1, page),
    limit: take,
  };
}

async function setAdminCoursePublished({ actorUserId, courseId, published, reason }) {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');
  }

  course.published = Boolean(published);
  await course.save();

  await recordAdminAction({
    actorUserId,
    action: published ? 'course_publish' : 'course_unpublish',
    targetType: 'course',
    targetId: String(course._id),
    reason: reason || (published ? 'Xuất bản khóa học' : 'Ẩn khóa học'),
    payload: { slug: course.slug, published: course.published },
  });

  return {
    id: String(course._id),
    slug: course.slug,
    title: course.title,
    published: course.published,
  };
}

module.exports = { listAdminCourses, setAdminCoursePublished };
