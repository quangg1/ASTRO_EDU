const { AppError } = require('../../../shared/errors');
const {
  eventEngagementRepository,
  eventReminderRepository,
} = require('../repositories/astronomyEventRepository');
const { GEM_EARN } = require('../../rewards/constants/gemEarn');
const {
  getCachedSeasonalMultiplier,
  scaleEarn,
} = require('../../rewards/services/gemRuntimeConfigService');
const { applyGemEarn } = require('../../rewards/services/rewardEngine');
const { hasEarnedFor } = require('../../rewards/services/gemLedgerService');
const { createNotification } = require('../../notifications/services/notificationService');
const { findEventByPublicId } = require('./astronomyEventService');

const REMIND_HOURS_BEFORE = 24;
const OBSERVE_REASON = 'astronomy_event_observed';

function defaultRemindAt(event) {
  const peak = event.peakAt ? new Date(event.peakAt) : new Date(event.startAt);
  return new Date(peak.getTime() - REMIND_HOURS_BEFORE * 3600000);
}

/** Sự kiện giáo dục không có gì để ngắm nên không nhắc lịch cũng không thưởng gem. */
async function loadObservableEvent(eventId, notObservableMessage) {
  const event = await findEventByPublicId(eventId);
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sự kiện');
  if (event.eventKind !== 'observable') {
    throw new AppError(400, 'NOT_OBSERVABLE', notObservableMessage);
  }
  return event;
}

async function setEventReminder(userId, eventId) {
  const event = await loadObservableEvent(eventId, 'Chỉ sự kiện quan sát mới có nhắc nhở');

  const remindAt = defaultRemindAt(event);
  const now = new Date();
  if (remindAt <= now) {
    throw new AppError(400, 'TOO_LATE', 'Sự kiện quá gần — không thể đặt nhắc nhở');
  }

  await eventReminderRepository.schedule(userId, eventId, remindAt);
  await eventEngagementRepository.markEngagement(userId, eventId, { remindedAt: now });

  return { eventId, remindAt: remindAt.toISOString(), reminded: true };
}

/**
 * Ảnh quan sát phải nằm trong thư mục upload của chính người dùng, nếu không
 * bất kỳ ai cũng có thể gán ảnh của người khác vào lần check-in của mình.
 */
function validateObservationPhotoUrl(userId, photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;

  const userSeg = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!userSeg || !trimmed.includes(`observations/${userSeg}/`)) {
    throw new AppError(400, 'INVALID_PHOTO', 'Ảnh quan sát không hợp lệ');
  }
  return trimmed;
}

async function checkInEvent(userId, eventId, options = {}) {
  const event = await loadObservableEvent(eventId, 'Chỉ sự kiện quan sát mới check-in được gem');

  const now = new Date();
  if (now < new Date(event.startAt) || now > new Date(event.endAt)) {
    throw new AppError(400, 'OUT_OF_WINDOW', 'Chỉ check-in trong khung thời gian sự kiện');
  }

  const validatedPhoto = validateObservationPhotoUrl(userId, options.photoUrl);
  const photoPatch = validatedPhoto ? { observationPhotoUrl: validatedPhoto } : {};

  // Check-in lại vẫn cập nhật ảnh/thời điểm nhưng không thưởng gem lần hai.
  const alreadyAwarded = await hasEarnedFor({
    userId: String(userId),
    reason: OBSERVE_REASON,
    entityId: eventId,
  });
  if (alreadyAwarded) {
    await eventEngagementRepository.markEngagement(userId, eventId, {
      checkedInAt: now,
      ...photoPatch,
    });
    return {
      eventId,
      checkedIn: true,
      gemAwarded: false,
      gemAmount: 0,
      alreadyAwarded: true,
      observationPhotoUrl: validatedPhoto || null,
    };
  }

  const base = event.gemRewardOverride ?? GEM_EARN[OBSERVE_REASON];
  const amount = scaleEarn(base, await getCachedSeasonalMultiplier());

  await applyGemEarn(String(userId), amount, {
    reason: OBSERVE_REASON,
    entityId: String(eventId),
    metadata: { eventType: event.type, titleVi: event.titleVi },
  });

  await eventEngagementRepository.markEngagement(userId, eventId, {
    checkedInAt: now,
    gemAwardedAt: now,
    gemAmount: amount,
    ...photoPatch,
  });

  return {
    eventId,
    checkedIn: true,
    gemAwarded: true,
    gemAmount: amount,
    observationPhotoUrl: validatedPhoto || null,
  };
}

function reminderNotification(event) {
  const peakLabel = event.peakAt
    ? new Date(event.peakAt).toLocaleString('vi-VN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return {
    type: 'astronomy_event_reminder',
    titleVi: `Nhắc quan sát: ${event.titleVi}`,
    bodyVi: peakLabel
      ? `Đỉnh dự kiến ${peakLabel}. Mở Lịch Thiên Văn hoặc La bàn Sky khi trời tối.`
      : 'Sự kiện thiên văn sắp diễn ra — chuẩn bị quan sát nhé!',
    href: `/calendar?event=${encodeURIComponent(event.eventId)}`,
    metadata: { eventId: event.eventId, type: event.type },
  };
}

async function processDueReminders(now = new Date()) {
  const due = await eventReminderRepository.listDue(now);

  let sent = 0;
  for (const row of due) {
    const event = await findEventByPublicId(row.eventId);
    // Sự kiện bị gỡ hoặc rút xuất bản: tắt lịch nhắc thay vì thử lại mãi.
    if (!event) {
      await eventReminderRepository.deactivate(row._id);
      continue;
    }

    await createNotification({ userId: row.userId, ...reminderNotification(event) });
    await eventReminderRepository.markNotified(row._id, now);
    sent += 1;
  }
  return { sent, processed: due.length };
}

module.exports = {
  setEventReminder,
  checkInEvent,
  processDueReminders,
  defaultRemindAt,
};
