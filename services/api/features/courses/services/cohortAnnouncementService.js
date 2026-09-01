const { cohortAnnouncementRepository, cohortEnrollmentRepository } = require('../repositories');
const { listMailableRecipients } = require('../../auth/services/userDirectoryService');
const { createNotification } = require('../../notifications/services/notificationService');
const { sendMail } = require('../../../shared/mailer');
const { getRuntimeEnv } = require('../../../config/runtimeEnv');
const { AppError } = require('../../../shared/errors');

const NOTIFICATION_BODY_PREVIEW = 240;

function cohortHref(course, cohort) {
  return `/courses/${course.slug}/cohort/${cohort._id}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function listAnnouncements(cohortId) {
  return cohortAnnouncementRepository.listForCohort(cohortId);
}

async function createAnnouncement({ course, cohort, authorId, input }) {
  const doc = await cohortAnnouncementRepository.create({
    cohortId: cohort._id,
    courseId: course._id,
    authorId,
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    notifyEmail: input.notifyEmail,
  });

  // Fan-out is best-effort: a failed email must not roll back the announcement.
  void notifyCohortAnnouncement({ cohort, course, announcement: doc, authorId }).catch((err) =>
    console.error('[cohort] announcement fan-out failed:', err?.message || err),
  );

  return doc;
}

async function updateAnnouncement({ course, cohort, announcementId, input }) {
  const doc = await cohortAnnouncementRepository.findDocInCohort({
    announcementId,
    cohortId: cohort._id,
    courseId: course._id,
  });
  if (!doc) throw AppError.notFound('Không tìm thấy thông báo');

  if (input.title !== undefined) doc.title = input.title;
  if (input.body !== undefined) doc.body = input.body;
  if (input.pinned !== undefined) doc.pinned = input.pinned;
  await doc.save();
  return doc;
}

async function deleteAnnouncement({ course, cohort, announcementId }) {
  const result = await cohortAnnouncementRepository.deleteInCohort({
    announcementId,
    cohortId: cohort._id,
    courseId: course._id,
  });
  if (!result.deletedCount) throw AppError.notFound('Không tìm thấy thông báo');
}

/** In-app notification for every member, plus email when the author opted in. */
async function notifyCohortAnnouncement({ cohort, course, announcement, authorId }) {
  const memberIds = await cohortEnrollmentRepository.listMemberIds(cohort._id);
  const recipientIds = memberIds.filter((id) => String(id) !== String(authorId));
  if (!recipientIds.length) return;

  const href = cohortHref(course, cohort);
  await Promise.all(
    recipientIds.map((userId) =>
      createNotification({
        userId,
        type: 'cohort_announcement',
        titleVi: announcement.title,
        bodyVi: announcement.body?.slice(0, NOTIFICATION_BODY_PREVIEW) || 'Thông báo mới từ lớp học.',
        href,
        metadata: { cohortId: String(cohort._id), announcementId: String(announcement._id) },
      }).catch(() => null),
    ),
  );

  if (!announcement.notifyEmail) return;
  await emailAnnouncement({ cohort, course, announcement, recipientIds, href });
}

async function emailAnnouncement({ cohort, course, announcement, recipientIds, href }) {
  const recipients = await listMailableRecipients(recipientIds);
  if (!recipients.length) return;

  const link = `${getRuntimeEnv().clientUrl}${href}`;
  const subject = `[${cohort.title}] ${announcement.title}`;
  const text = `${announcement.title}\n\n${announcement.body}\n\n— ${course.title}`;
  const html = [
    `<p><strong>${escapeHtml(announcement.title)}</strong></p>`,
    `<div>${escapeHtml(announcement.body).replace(/\n/g, '<br>')}</div>`,
    `<p><a href="${link}">Mở lớp học</a></p>`,
  ].join('');

  await Promise.all(
    recipients.map((recipient) =>
      sendMail({ to: recipient.email, subject, text, html }).catch(() => null),
    ),
  );
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  notifyCohortAnnouncement,
};
