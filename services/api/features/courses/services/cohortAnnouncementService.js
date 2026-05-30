const User = require('../../auth/models/User');
const CohortEnrollment = require('../models/CohortEnrollment');
const CohortAnnouncement = require('../models/CohortAnnouncement');
const { createNotification } = require('../../notifications/services/notificationService');
const { sendMail } = require('../../../shared/mailer');

async function notifyCohortAnnouncement({ cohort, course, announcement, authorId }) {
  const members = await CohortEnrollment.find({ cohortId: cohort._id }).select('userId').lean();
  const userIds = members.map((m) => m.userId).filter((id) => id !== authorId);
  const href = `/courses/${course.slug}/cohort/${cohort._id}`;

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type: 'cohort_announcement',
        titleVi: announcement.title,
        bodyVi: announcement.body?.slice(0, 240) || 'Thông báo mới từ lớp học.',
        href,
        metadata: { cohortId: String(cohort._id), announcementId: String(announcement._id) },
      }).catch(() => null),
    ),
  );

  if (!announcement.notifyEmail) return;

  const users = await User.find({ _id: { $in: userIds } })
    .select('email displayName')
    .lean();
  const subject = `[${cohort.title}] ${announcement.title}`;
  const text = `${announcement.title}\n\n${announcement.body}\n\n— ${course.title}`;
  const html = `<p><strong>${announcement.title}</strong></p><div>${String(announcement.body || '').replace(/\n/g, '<br>')}</div><p><a href="${process.env.CLIENT_URL || 'https://galaxies.edu.vn'}${href}">Mở lớp học</a></p>`;

  for (const u of users) {
    const to = u?.email?.trim();
    if (!to) continue;
    void sendMail({ to, subject, text, html }).catch(() => null);
  }
}

module.exports = { notifyCohortAnnouncement };
