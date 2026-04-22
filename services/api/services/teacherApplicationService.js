const TeacherApplication = require('../features/auth/models/TeacherApplication');
const User = require('../features/auth/models/User');
const { AppError } = require('../shared/errors');
const { updateAdminUserRole } = require('./adminUserService');
const { sendTeacherApplicationDecisionEmail } = require('../shared/mailer');

const BIO_MIN = 30;
const BIO_MAX = 4000;

function normalizeBio(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

async function submitTeacherApplication({ userId, bio, organization }) {
  const text = normalizeBio(bio);
  if (text.length < BIO_MIN) {
    throw new AppError(400, 'BIO_TOO_SHORT', `Giới thiệu cần ít nhất ${BIO_MIN} ký tự`);
  }
  if (text.length > BIO_MAX) {
    throw new AppError(400, 'BIO_TOO_LONG', `Giới thiệu tối đa ${BIO_MAX} ký tự`);
  }

  const org =
    typeof organization === 'string' && organization.trim().length > 0 ? organization.trim().slice(0, 500) : '';

  const user = await User.findById(userId).select('role accountStatus');
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }
  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Tài khoản đã ngừng hoạt động');
  }
  if (user.role !== 'student') {
    throw new AppError(400, 'TEACHER_APPLICATION_NOT_ELIGIBLE', 'Chỉ tài khoản học viên mới có thể gửi đơn xin quyền giảng viên');
  }

  const existingPending = await TeacherApplication.findOne({ userId, status: 'pending' });
  if (existingPending) {
    throw new AppError(409, 'TEACHER_APPLICATION_ALREADY_PENDING', 'Bạn đã có đơn đang chờ duyệt');
  }

  const doc = await TeacherApplication.create({
    userId,
    status: 'pending',
    bio: text,
    organization: org,
  });

  return formatApplication(doc);
}

function formatApplication(doc) {
  const rawUid = doc.userId;
  const uid = rawUid && typeof rawUid === 'object' && rawUid._id ? rawUid._id : rawUid;
  return {
    id: String(doc._id),
    userId: uid != null ? String(uid) : '',
    status: doc.status,
    bio: doc.bio,
    organization: doc.organization || '',
    reviewedAt: doc.reviewedAt || null,
    reviewedByUserId: doc.reviewedByUserId || null,
    reviewNote: doc.reviewNote || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function getMyApplicationStatus(userId) {
  const pending = await TeacherApplication.findOne({ userId, status: 'pending' }).sort({ createdAt: -1 }).lean();
  if (pending) {
    return { pending: formatApplication(pending), last: null };
  }
  const last = await TeacherApplication.findOne({ userId }).sort({ createdAt: -1 }).lean();
  return {
    pending: null,
    last: last ? formatApplication(last) : null,
  };
}

async function listApplicationsForAdmin({ status = 'pending' }) {
  const q = {};
  if (status && status !== 'all') {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new AppError(400, 'INVALID_FILTER', 'status phải là pending, approved, rejected hoặc all');
    }
    q.status = status;
  }

  const rows = await TeacherApplication.find(q).sort({ createdAt: -1 }).limit(200).populate('userId', 'email displayName role').lean();

  return rows
    .map((row) => {
      const u = row.userId;
      if (!u || typeof u !== 'object' || !u._id) {
        return null;
      }
      return {
        ...formatApplication(row),
        user: {
          id: String(u._id),
          email: u.email || null,
          displayName: u.displayName || '',
          role: u.role || 'student',
        },
      };
    })
    .filter(Boolean);
}

async function reviewApplication({ actorUserId, applicationId, action, note }) {
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError(400, 'INVALID_ACTION', 'action phải là approve hoặc reject');
  }

  const app = await TeacherApplication.findById(applicationId);
  if (!app || app.status !== 'pending') {
    throw new AppError(404, 'TEACHER_APPLICATION_NOT_FOUND', 'Không tìm thấy đơn chờ duyệt');
  }

  const targetUserId = String(app.userId);
  const reviewNote = typeof note === 'string' ? note.trim().slice(0, 2000) : '';

  const applicant = await User.findById(targetUserId).select('email displayName');

  if (action === 'reject') {
    app.status = 'rejected';
    app.reviewedAt = new Date();
    app.reviewedByUserId = String(actorUserId);
    app.reviewNote = reviewNote;
    await app.save();
    if (applicant?.email) {
      await sendTeacherApplicationDecisionEmail({
        to: applicant.email,
        displayName: applicant.displayName,
        action: 'reject',
        reviewNote,
      });
    }
    return formatApplication(app);
  }

  await updateAdminUserRole({
    actorUserId,
    targetUserId,
    role: 'teacher',
  });

  app.status = 'approved';
  app.reviewedAt = new Date();
  app.reviewedByUserId = String(actorUserId);
  app.reviewNote = reviewNote;
  await app.save();

  if (applicant?.email) {
    await sendTeacherApplicationDecisionEmail({
      to: applicant.email,
      displayName: applicant.displayName,
      action: 'approve',
      reviewNote: '',
    });
  }

  return formatApplication(app);
}

module.exports = {
  submitTeacherApplication,
  getMyApplicationStatus,
  listApplicationsForAdmin,
  reviewApplication,
  BIO_MIN,
  BIO_MAX,
};
