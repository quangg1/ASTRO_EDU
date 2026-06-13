const AstronomyEventReminder = require('../models/AstronomyEventReminder');
const UserAstronomyEventEngagement = require('../models/UserAstronomyEventEngagement');
const GemTransaction = require('../../rewards/models/GemTransaction');
const { GEM_EARN } = require('../../rewards/constants/gemEarn');
const { getCachedSeasonalMultiplier, scaleEarn } = require('../../rewards/services/gemRuntimeConfigService');
const { applyGemEarn } = require('../../rewards/services/rewardEngine');
const { createNotification } = require('../../notifications/services/notificationService');
const { findEventByPublicId } = require('./astronomyEventService');

const REMIND_HOURS_BEFORE = 24;

function defaultRemindAt(event) {
  const peak = event.peakAt ? new Date(event.peakAt) : new Date(event.startAt);
  return new Date(peak.getTime() - REMIND_HOURS_BEFORE * 3600000);
}

async function upsertEngagement(userId, eventId, patch) {
  return UserAstronomyEventEngagement.findOneAndUpdate(
    { userId: String(userId), eventId: String(eventId) },
    { $set: patch },
    { upsert: true, new: true },
  );
}

async function setEventReminder(userId, eventId) {
  const event = await findEventByPublicId(eventId);
  if (!event) {
    const err = new Error('Không tìm thấy sự kiện');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (event.eventKind !== 'observable') {
    const err = new Error('Chỉ sự kiện quan sát mới có nhắc nhở');
    err.code = 'NOT_OBSERVABLE';
    throw err;
  }

  const remindAt = defaultRemindAt(event);
  const now = new Date();
  if (remindAt <= now) {
    const err = new Error('Sự kiện quá gần — không thể đặt nhắc nhở');
    err.code = 'TOO_LATE';
    throw err;
  }

  await AstronomyEventReminder.findOneAndUpdate(
    { userId: String(userId), eventId: String(eventId) },
    { remindAt, active: true, notifiedAt: null },
    { upsert: true, new: true },
  );
  await upsertEngagement(userId, eventId, { remindedAt: now });

  return { eventId, remindAt: remindAt.toISOString(), reminded: true };
}

function validateObservationPhotoUrl(userId, photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;
  const userSeg = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!userSeg || !trimmed.includes(`observations/${userSeg}/`)) {
    const err = new Error('Ảnh quan sát không hợp lệ');
    err.code = 'INVALID_PHOTO';
    throw err;
  }
  return trimmed;
}

async function checkInEvent(userId, eventId, options = {}) {
  const event = await findEventByPublicId(eventId);
  if (!event) {
    const err = new Error('Không tìm thấy sự kiện');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (event.eventKind !== 'observable') {
    const err = new Error('Chỉ sự kiện quan sát mới check-in được gem');
    err.code = 'NOT_OBSERVABLE';
    throw err;
  }

  const now = new Date();
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  if (now < start || now > end) {
    const err = new Error('Chỉ check-in trong khung thời gian sự kiện');
    err.code = 'OUT_OF_WINDOW';
    throw err;
  }

  const validatedPhoto = validateObservationPhotoUrl(userId, options.photoUrl);
  const photoPatch = validatedPhoto ? { observationPhotoUrl: validatedPhoto } : {};

  const existingGem = await GemTransaction.exists({
    userId: String(userId),
    reason: 'astronomy_event_observed',
    entityId: String(eventId),
  });
  if (existingGem) {
    await upsertEngagement(userId, eventId, { checkedInAt: now, ...photoPatch });
    return {
      eventId,
      checkedIn: true,
      gemAwarded: false,
      gemAmount: 0,
      alreadyAwarded: true,
      observationPhotoUrl: validatedPhoto || null,
    };
  }

  const base = event.gemRewardOverride ?? GEM_EARN.astronomy_event_observed;
  const mult = await getCachedSeasonalMultiplier();
  const amount = scaleEarn(base, mult);

  await applyGemEarn(String(userId), amount, {
    reason: 'astronomy_event_observed',
    entityId: String(eventId),
    metadata: { eventType: event.type, titleVi: event.titleVi },
  });

  await upsertEngagement(userId, eventId, {
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

async function processDueReminders(now = new Date()) {
  const due = await AstronomyEventReminder.find({
    active: true,
    notifiedAt: null,
    remindAt: { $lte: now },
  })
    .limit(100)
    .lean();

  let sent = 0;
  for (const row of due) {
    const event = await findEventByPublicId(row.eventId);
    if (!event) {
      await AstronomyEventReminder.updateOne({ _id: row._id }, { active: false });
      continue;
    }

    const peakLabel = event.peakAt
      ? new Date(event.peakAt).toLocaleString('vi-VN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    await createNotification({
      userId: row.userId,
      type: 'astronomy_event_reminder',
      titleVi: `Nhắc quan sát: ${event.titleVi}`,
      bodyVi: peakLabel
        ? `Đỉnh dự kiến ${peakLabel}. Mở Lịch Thiên Văn hoặc La bàn Sky khi trời tối.`
        : 'Sự kiện thiên văn sắp diễn ra — chuẩn bị quan sát nhé!',
      href: `/calendar?event=${encodeURIComponent(event.eventId)}`,
      metadata: { eventId: event.eventId, type: event.type },
    });

    await AstronomyEventReminder.updateOne({ _id: row._id }, { notifiedAt: now });
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
