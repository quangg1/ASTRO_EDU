const express = require('express');
const Course = require('../models/Course');
const CourseLearningEvent = require('../models/CourseLearningEvent');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { courseEventsLimiter } = require('../../../shared/security/rateLimiters');

const router = express.Router({ mergeParams: true });

const ALLOWED = new Set([
  'course_lesson_opened',
  'course_lesson_dwell',
  'course_lesson_completed',
  'course_quiz_entered',
  'course_assignment_viewed',
]);

function normalizeEvent(raw, course, userId) {
  const eventName = String(raw?.eventName || '').trim();
  const sessionId = String(raw?.sessionId || '').trim();
  const lessonSlug = String(raw?.lessonSlug || '').trim();
  if (!ALLOWED.has(eventName) || !sessionId || !lessonSlug) return null;
  const tsRaw = raw?.timestamp ? new Date(raw.timestamp) : new Date();
  const timestamp = Number.isNaN(tsRaw.getTime()) ? new Date() : tsRaw;
  let cohortId = null;
  if (raw?.cohortId) {
    try {
      cohortId = raw.cohortId;
    } catch {
      cohortId = null;
    }
  }
  return {
    userId: userId || null,
    sessionId,
    courseId: course._id,
    courseSlug: course.slug,
    cohortId,
    eventName,
    lessonSlug,
    timestamp,
    durationSec: Number.isFinite(Number(raw?.durationSec)) ? Number(raw.durationSec) : null,
    client: ['web', 'android', 'ios'].includes(raw?.client) ? raw.client : 'web',
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  };
}

router.post('/:slug/events/batch', courseEventsLimiter, optionalAuth, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).select('_id slug').lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) {
      return res.status(400).json({ success: false, error: 'events phải là mảng có dữ liệu' });
    }
    if (events.length > 100) {
      return res.status(400).json({ success: false, error: 'Tối đa 100 events mỗi batch' });
    }
    const normalized = [];
    const rejections = [];
    events.forEach((ev, index) => {
      const item = normalizeEvent(ev, course, req.userId || null);
      if (!item) rejections.push({ index, reason: 'invalid_event_shape' });
      else normalized.push(item);
    });
    if (normalized.length > 0) {
      await CourseLearningEvent.insertMany(normalized, { ordered: false });
    }
    res.json({
      success: true,
      data: { acceptedCount: normalized.length, rejectedCount: rejections.length, rejections },
    });
  } catch (err) {
    console.error('[courseEvents] batch error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
