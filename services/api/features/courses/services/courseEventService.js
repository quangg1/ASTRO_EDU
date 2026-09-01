const { AppError } = require('../../../shared/errors');
const { courseRepository, courseEventRepository } = require('../repositories');

const ALLOWED_EVENTS = new Set([
  'course_lesson_opened',
  'course_lesson_dwell',
  'course_lesson_completed',
  'course_quiz_entered',
  'course_assignment_viewed',
]);

const CLIENTS = new Set(['web', 'android', 'ios']);

/**
 * Telemetry đến từ client nên không tin được: sự kiện sai hình dạng bị loại
 * riêng lẻ và báo lại theo chỉ số, thay vì làm hỏng cả lô.
 */
function normalizeEvent(raw, course, userId) {
  const eventName = String(raw?.eventName || '').trim();
  const sessionId = String(raw?.sessionId || '').trim();
  const lessonSlug = String(raw?.lessonSlug || '').trim();
  if (!ALLOWED_EVENTS.has(eventName) || !sessionId || !lessonSlug) return null;

  const parsedAt = raw?.timestamp ? new Date(raw.timestamp) : new Date();
  const durationSec = Number(raw?.durationSec);

  return {
    userId: userId || null,
    sessionId,
    courseId: course._id,
    courseSlug: course.slug,
    cohortId: raw?.cohortId || null,
    eventName,
    lessonSlug,
    timestamp: Number.isNaN(parsedAt.getTime()) ? new Date() : parsedAt,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    client: CLIENTS.has(raw?.client) ? raw.client : 'web',
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  };
}

async function recordBatch({ slug, userId, events }) {
  const course = await courseRepository.findOne({ slug }, { projection: '_id slug' });
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  const accepted = [];
  const rejections = [];
  events.forEach((event, index) => {
    const normalized = normalizeEvent(event, course, userId);
    if (normalized) accepted.push(normalized);
    else rejections.push({ index, reason: 'invalid_event_shape' });
  });

  await courseEventRepository.recordBatch(accepted);

  return { acceptedCount: accepted.length, rejectedCount: rejections.length, rejections };
}

module.exports = { recordBatch, ALLOWED_EVENTS };
