const crypto = require('crypto');
const UserSavedItem = require('../models/UserSavedItem');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const CourseLearningEvent = require('../../courses/models/CourseLearningEvent');
const Course = require('../../courses/models/Course');

function buildItemKey(source, payload) {
  if (source === 'learning-path') {
    const lessonId = String(payload.lessonId || '').trim();
    if (!lessonId) throw new Error('lessonId bắt buộc');
    return `lp:${lessonId}`;
  }
  if (source === 'course') {
    const courseSlug = String(payload.courseSlug || '').trim();
    const lessonSlug = String(payload.lessonSlug || '').trim();
    if (!courseSlug || !lessonSlug) throw new Error('courseSlug và lessonSlug bắt buộc');
    return `course:${courseSlug}:${lessonSlug}`;
  }
  throw new Error('source không hợp lệ');
}

function buildHref(source, payload) {
  if (source === 'learning-path') {
    const moduleId = encodeURIComponent(String(payload.moduleId || '').trim());
    const nodeId = encodeURIComponent(String(payload.nodeId || '').trim());
    const lessonId = encodeURIComponent(String(payload.lessonId || '').trim());
    return `/tutorial/${moduleId}/${nodeId}/${lessonId}`;
  }
  const courseSlug = encodeURIComponent(String(payload.courseSlug || '').trim());
  const lessonSlug = encodeURIComponent(String(payload.lessonSlug || '').trim());
  return `/courses/${courseSlug}/learn/${lessonSlug}`;
}

function serializeItem(doc) {
  if (!doc) return null;
  const source = doc.source;
  return {
    id: String(doc._id),
    itemKey: doc.itemKey,
    source,
    lessonId: doc.lessonId || null,
    moduleId: doc.moduleId || null,
    nodeId: doc.nodeId || null,
    depth: doc.depth || null,
    courseSlug: doc.courseSlug || null,
    lessonSlug: doc.lessonSlug || null,
    courseId: doc.courseId || null,
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    href: buildHref(source, doc),
    savedAt: doc.savedAt,
  };
}

async function recordFavoriteEvent({ userId, source, saved, payload }) {
  const sessionId = `saved-${userId}-${Date.now()}`;
  const eventId = crypto.randomUUID();
  const timestamp = new Date();
  if (source === 'learning-path') {
    await LearningPathEvent.create({
      eventId,
      schemaVersion: 1,
      userId,
      sessionId,
      eventName: saved ? 'lp_lesson_favorited' : 'lp_lesson_unfavorited',
      timestamp,
      moduleId: payload.moduleId || null,
      nodeId: payload.nodeId || null,
      lessonId: payload.lessonId || null,
      depth: payload.depth || null,
      client: 'web',
      metadata: { title: payload.title || '', subtitle: payload.subtitle || '' },
    });
    return;
  }
  const courseSlug = String(payload.courseSlug || '').trim();
  const course = courseSlug ? await Course.findOne({ slug: courseSlug }).select('_id slug').lean() : null;
  if (!course) return;
  await CourseLearningEvent.create({
    userId,
    sessionId,
    courseId: course._id,
    courseSlug: course.slug,
    lessonSlug: String(payload.lessonSlug || '').trim(),
    eventName: saved ? 'course_lesson_favorited' : 'course_lesson_unfavorited',
    timestamp,
    client: 'web',
    metadata: { title: payload.title || '', subtitle: payload.subtitle || '' },
  });
}

async function listSavedItems(userId, { source, limit = 200 } = {}) {
  const query = { userId };
  if (source === 'learning-path' || source === 'course') query.source = source;
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const rows = await UserSavedItem.find(query).sort({ savedAt: -1 }).limit(cap).lean();
  return rows.map(serializeItem);
}

async function listSavedItemKeys(userId, source) {
  const query = { userId };
  if (source === 'learning-path' || source === 'course') query.source = source;
  const rows = await UserSavedItem.find(query).select('itemKey lessonId courseSlug lessonSlug source').lean();
  return rows;
}

async function toggleSavedItem(userId, body) {
  const source = String(body?.source || '').trim();
  if (!['learning-path', 'course'].includes(source)) {
    const err = new Error('source phải là learning-path hoặc course');
    err.status = 400;
    throw err;
  }
  const itemKey = buildItemKey(source, body);
  const existing = await UserSavedItem.findOne({ userId, itemKey }).lean();
  if (existing) {
    await UserSavedItem.deleteOne({ _id: existing._id });
    void recordFavoriteEvent({ userId, source, saved: false, payload: body }).catch(() => {});
    return { saved: false, item: null };
  }

  let courseId = null;
  if (source === 'course') {
    const course = await Course.findOne({ slug: String(body.courseSlug || '').trim() }).select('_id').lean();
    courseId = course?._id ? String(course._id) : null;
  }

  const depthRaw = String(body?.depth || '').trim();
  const depth = ['beginner', 'explorer', 'researcher'].includes(depthRaw) ? depthRaw : null;

  const created = await UserSavedItem.create({
    userId,
    source,
    itemKey,
    lessonId: source === 'learning-path' ? String(body.lessonId || '').trim() : null,
    moduleId: body.moduleId ? String(body.moduleId).trim() : null,
    nodeId: body.nodeId ? String(body.nodeId).trim() : null,
    depth,
    courseSlug: source === 'course' ? String(body.courseSlug || '').trim() : null,
    lessonSlug: source === 'course' ? String(body.lessonSlug || '').trim() : null,
    courseId,
    title: String(body.title || '').trim().slice(0, 300),
    subtitle: String(body.subtitle || '').trim().slice(0, 300),
    savedAt: new Date(),
  });
  void recordFavoriteEvent({ userId, source, saved: true, payload: body }).catch(() => {});
  return { saved: true, item: serializeItem(created.toObject()) };
}

async function deleteSavedItem(userId, itemKey) {
  const key = String(itemKey || '').trim();
  if (!key) {
    const err = new Error('itemKey bắt buộc');
    err.status = 400;
    throw err;
  }
  const existing = await UserSavedItem.findOne({ userId, itemKey: key }).lean();
  if (!existing) return { deleted: false };
  await UserSavedItem.deleteOne({ _id: existing._id });
  void recordFavoriteEvent({
    userId,
    source: existing.source,
    saved: false,
    payload: existing,
  }).catch(() => {});
  return { deleted: true };
}

async function getSavedAnalytics({ days = 30 } = {}) {
  const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 30, 1), 365) * 86400000);
  const [totals, topLp, topCourse, recent] = await Promise.all([
    UserSavedItem.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),
    UserSavedItem.aggregate([
      { $match: { source: 'learning-path' } },
      { $group: { _id: '$lessonId', title: { $first: '$title' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    UserSavedItem.aggregate([
      { $match: { source: 'course' } },
      {
        $group: {
          _id: { courseSlug: '$courseSlug', lessonSlug: '$lessonSlug' },
          title: { $first: '$title' },
          courseSlug: { $first: '$courseSlug' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    UserSavedItem.find({ savedAt: { $gte: since } })
      .sort({ savedAt: -1 })
      .limit(20)
      .select('userId source title subtitle savedAt lessonId courseSlug lessonSlug')
      .lean(),
  ]);
  return {
    totals: Object.fromEntries(totals.map((r) => [r._id, r.count])),
    topLearningPathLessons: topLp.map((r) => ({ lessonId: r._id, title: r.title, count: r.count })),
    topCourseLessons: topCourse.map((r) => ({
      courseSlug: r.courseSlug,
      lessonSlug: r._id?.lessonSlug,
      title: r.title,
      count: r.count,
    })),
    recentSaves: recent.map((r) => ({
      userId: r.userId,
      source: r.source,
      title: r.title,
      subtitle: r.subtitle,
      savedAt: r.savedAt,
      lessonId: r.lessonId,
      courseSlug: r.courseSlug,
      lessonSlug: r.lessonSlug,
    })),
  };
}

module.exports = {
  buildItemKey,
  buildHref,
  listSavedItems,
  listSavedItemKeys,
  toggleSavedItem,
  deleteSavedItem,
  getSavedAnalytics,
  serializeItem,
};
