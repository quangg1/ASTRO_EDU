const { AppError } = require('../../../shared/errors');
const { astronomyEventRepository } = require('../repositories/astronomyEventRepository');
const { recordAdminAction } = require('../../admin/lib/recordAdminAction');
const { eventToAdminDto, importSuggestionsFromCompute } = require('./astronomyEventService');
const { listTypeKits, updateTypeKit } = require('./typeKitService');

/** Trường biên tập viên được sửa tự do; ngày tháng và trạng thái xử lý riêng. */
const EDITABLE_FIELDS = [
  'titleVi',
  'summaryVi',
  'subtitleVi',
  'subtitleEn',
  'descriptionVi',
  'observationTipsVi',
  'visibilityLabelVi',
  'typeLabelVi',
  'type',
  'eventKind',
  'exploreView',
  'exploreTarget',
  'lessonHref',
  'quizHref',
  'difficulty',
  'moonPhaseHint',
  'reviewNote',
];

const notFound = () => AppError.notFound('Không tìm thấy');

async function loadEventDoc(id) {
  const doc = await astronomyEventRepository.findDocById(id);
  if (!doc) throw notFound();
  return doc;
}

function markPublished(doc, actorUserId) {
  doc.status = 'published';
  doc.publishedBy = String(actorUserId);
  doc.publishedAt = new Date();
}

async function listEvents() {
  const rows = await astronomyEventRepository.listForAdmin();
  return rows.map(eventToAdminDto);
}

async function createEvent(input, actorUserId) {
  const publishNow = input.status === 'published';
  try {
    const doc = await astronomyEventRepository.create({
      ...input,
      source: 'editorial',
      titleVi: input.titleVi || input.eventId,
      authoredBy: String(actorUserId),
      publishedBy: publishNow ? String(actorUserId) : null,
      publishedAt: publishNow ? new Date() : null,
    });
    return eventToAdminDto(doc);
  } catch (err) {
    if (err?.code === 11000) throw AppError.conflict('eventId đã tồn tại');
    throw err;
  }
}

async function updateEvent(id, patch, actorUserId) {
  const doc = await loadEventDoc(id);

  for (const field of EDITABLE_FIELDS) {
    if (patch[field] !== undefined) doc[field] = patch[field];
  }
  if (patch.startAt) doc.startAt = patch.startAt;
  if (patch.endAt) doc.endAt = patch.endAt;
  if (patch.peakAt !== undefined) doc.peakAt = patch.peakAt;
  if (patch.priority != null) doc.priority = patch.priority;
  if (patch.featured != null) doc.featured = patch.featured;
  if (patch.urgencyRank != null) doc.urgencyRank = patch.urgencyRank;
  if (patch.gemRewardOverride != null) doc.gemRewardOverride = patch.gemRewardOverride;

  // Chuyển sang published qua PATCH cũng phải ghi lại người và thời điểm duyệt.
  if (patch.status) {
    if (patch.status === 'published') markPublished(doc, actorUserId);
    else doc.status = patch.status;
  }

  await doc.save();
  return eventToAdminDto(doc);
}

async function publishEvent(id, actorUserId) {
  const doc = await loadEventDoc(id);
  markPublished(doc, actorUserId);
  await doc.save();

  await recordAdminAction({
    actorUserId,
    action: 'astronomy_event_publish',
    targetType: 'astronomy_event',
    targetId: doc.eventId,
  });
  return eventToAdminDto(doc);
}

async function deleteEvent(id) {
  const doc = await astronomyEventRepository.deleteById(id);
  if (!doc) throw notFound();
}

async function importSuggestions({ days, publish, actorUserId }) {
  const result = await importSuggestionsFromCompute({ days, actorUserId, publish });
  await recordAdminAction({
    actorUserId,
    action: 'astronomy_import_suggestions',
    targetType: 'astronomy_event',
    reason: `Import ${result.total} sự kiện (${publish ? 'publish' : 'draft'})`,
    payload: result,
  });
  return result;
}

async function listEventTypeKits() {
  return Object.values(await listTypeKits());
}

async function saveTypeKit(type, patch, actorUserId) {
  const kit = await updateTypeKit(type, patch, actorUserId);
  await recordAdminAction({
    actorUserId,
    action: 'astronomy_type_kit_update',
    targetType: 'astronomy_type_kit',
    targetId: type,
  });
  return kit;
}

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  publishEvent,
  deleteEvent,
  importSuggestions,
  listEventTypeKits,
  saveTypeKit,
};
