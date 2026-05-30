const TeacherApplication = require('../models/TeacherApplication');
const User = require('../models/User');
const { AppError } = require('../../../shared/errors');
const { updateAdminUserRole } = require('../../admin/services/adminUserService');
const {
  sendTeacherApplicationDecisionEmail,
  sendTeacherApplicationReceivedEmail,
} = require('../../../shared/mailer');
const { notifyTeacherApplicationDecision } = require('../../notifications/services/notificationService');
const {
  upsertTeacherProfileFromApplication,
  normalizeExpertise,
} = require('./teacherProfileService');

const BIO_MIN = 30;
const BIO_MAX = 4000;
const REJECT_NOTE_MIN = 10;

function normalizeBio(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function normalizePhone(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 40);
}

function phoneDigitCount(phone) {
  return (phone.match(/\d/g) || []).length;
}

function normalizeTeachingLevels(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => String(x || '').trim()).filter((x) => x.length > 0))].slice(0, 12);
}

function formatApplication(doc) {
  const rawUid = doc.userId;
  const uid = rawUid && typeof rawUid === 'object' && rawUid._id ? rawUid._id : rawUid;
  return {
    id: String(doc._id),
    userId: uid != null ? String(uid) : '',
    status: doc.status,
    applicationEmail: doc.applicationEmail || '',
    fullName: doc.fullName || '',
    phone: doc.phone || '',
    headline: doc.headline || '',
    city: doc.city || '',
    organizationRole: doc.organizationRole || '',
    teachingLevels: Array.isArray(doc.teachingLevels) ? doc.teachingLevels : [],
    bio: doc.bio || '',
    organization: doc.organization || '',
    expertise: Array.isArray(doc.expertise) ? doc.expertise : [],
    education: doc.education || '',
    yearsExperience: doc.yearsExperience ?? null,
    website: doc.website || '',
    linkedin: doc.linkedin || '',
    avatarUrl: doc.avatarUrl || null,
    cvUrl: doc.cvUrl || null,
    cvFileName: doc.cvFileName || '',
    certificateUrl: doc.certificateUrl || null,
    certificateFileName: doc.certificateFileName || '',
    cvReviewedAt: doc.cvReviewedAt || null,
    cvReviewedByUserId: doc.cvReviewedByUserId || null,
    reviewedAt: doc.reviewedAt || null,
    reviewedByUserId: doc.reviewedByUserId || null,
    reviewNote: doc.reviewNote || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function submitTeacherApplication(payload) {
  const {
    userId,
    bio,
    organization,
    fullName,
    phone,
    headline,
    city,
    organizationRole,
    teachingLevels,
    expertise,
    education,
    yearsExperience,
    website,
    linkedin,
    avatarUrl,
    cvUrl,
    cvFileName,
    certificateUrl,
    certificateFileName,
  } = payload;

  const text = normalizeBio(bio);
  if (text.length < BIO_MIN) {
    throw new AppError(400, 'BIO_TOO_SHORT', `Giới thiệu cần ít nhất ${BIO_MIN} ký tự`);
  }
  if (text.length > BIO_MAX) {
    throw new AppError(400, 'BIO_TOO_LONG', `Giới thiệu tối đa ${BIO_MAX} ký tự`);
  }

  const name = typeof fullName === 'string' ? fullName.trim() : '';
  if (name.length < 2) {
    throw new AppError(400, 'FULL_NAME_REQUIRED', 'Họ tên đầy đủ là bắt buộc');
  }

  const expertiseList = normalizeExpertise(expertise);
  if (expertiseList.length === 0) {
    throw new AppError(400, 'EXPERTISE_REQUIRED', 'Vui lòng ghi ít nhất một lĩnh vực / môn giảng dạy');
  }

  const cv = typeof cvUrl === 'string' ? cvUrl.trim() : '';
  if (!cv) {
    throw new AppError(400, 'CV_REQUIRED', 'Vui lòng tải CV (PDF) trước khi gửi đơn');
  }

  const org =
    typeof organization === 'string' && organization.trim().length > 0 ? organization.trim().slice(0, 500) : '';
  if (!org) {
    throw new AppError(400, 'ORGANIZATION_REQUIRED', 'Cơ quan / trường là bắt buộc');
  }

  const phoneNorm = normalizePhone(phone);
  if (phoneDigitCount(phoneNorm) < 9) {
    throw new AppError(400, 'PHONE_REQUIRED', 'Số điện thoại hợp lệ là bắt buộc (ít nhất 9 chữ số)');
  }

  const headlineText = typeof headline === 'string' ? headline.trim() : '';
  if (headlineText.length < 3) {
    throw new AppError(400, 'HEADLINE_REQUIRED', 'Chức danh / mô tả ngắn là bắt buộc');
  }

  const educationText = typeof education === 'string' ? education.trim() : '';
  if (educationText.length < 2) {
    throw new AppError(400, 'EDUCATION_REQUIRED', 'Học vấn là bắt buộc');
  }

  const user = await User.findById(userId).select('role accountStatus email displayName');
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

  let years = null;
  if (yearsExperience != null && yearsExperience !== '') {
    const n = Number(yearsExperience);
    if (Number.isFinite(n)) years = Math.min(80, Math.max(0, n));
  }

  const doc = await TeacherApplication.create({
    userId,
    status: 'pending',
    applicationEmail: user.email || '',
    fullName: name.slice(0, 200),
    phone: phoneNorm,
    headline: headlineText.slice(0, 300),
    city: typeof city === 'string' ? city.trim().slice(0, 120) : '',
    organizationRole: typeof organizationRole === 'string' ? organizationRole.trim().slice(0, 200) : '',
    teachingLevels: normalizeTeachingLevels(teachingLevels),
    bio: text,
    organization: org,
    expertise: expertiseList,
    education: educationText.slice(0, 2000),
    yearsExperience: years,
    website: typeof website === 'string' ? website.trim().slice(0, 500) : '',
    linkedin: typeof linkedin === 'string' ? linkedin.trim().slice(0, 500) : '',
    avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
    cvUrl: cv,
    cvFileName: typeof cvFileName === 'string' ? cvFileName.trim().slice(0, 260) : 'cv.pdf',
    certificateUrl:
      typeof certificateUrl === 'string' && certificateUrl.trim() ? certificateUrl.trim() : null,
    certificateFileName:
      typeof certificateFileName === 'string' ? certificateFileName.trim().slice(0, 260) : '',
  });

  if (user.email) {
    await sendTeacherApplicationReceivedEmail({
      to: user.email,
      displayName: name || user.displayName,
    });
  }

  return formatApplication(doc);
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

async function markCvReviewed({ actorUserId, applicationId }) {
  const app = await TeacherApplication.findById(applicationId);
  if (!app || app.status !== 'pending') {
    throw new AppError(404, 'TEACHER_APPLICATION_NOT_FOUND', 'Không tìm thấy đơn chờ duyệt');
  }
  if (!app.cvUrl) {
    throw new AppError(400, 'CV_MISSING', 'Đơn chưa có file CV');
  }
  app.cvReviewedAt = new Date();
  app.cvReviewedByUserId = String(actorUserId);
  await app.save();
  return formatApplication(app);
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
    if (reviewNote.length < REJECT_NOTE_MIN) {
      throw new AppError(
        400,
        'REJECT_NOTE_REQUIRED',
        `Vui lòng ghi lý do từ chối (ít nhất ${REJECT_NOTE_MIN} ký tự)`,
      );
    }
    app.status = 'rejected';
    app.reviewedAt = new Date();
    app.reviewedByUserId = String(actorUserId);
    app.reviewNote = reviewNote;
    await app.save();
    if (applicant?.email) {
      await sendTeacherApplicationDecisionEmail({
        to: applicant.email,
        displayName: app.fullName || applicant.displayName,
        action: 'reject',
        reviewNote,
      });
    }
    void notifyTeacherApplicationDecision({
      userId: targetUserId,
      approved: false,
      reviewNote,
    });
    return formatApplication(app);
  }

  if (!app.cvUrl) {
    throw new AppError(400, 'CV_REQUIRED', 'Đơn thiếu CV — không thể duyệt');
  }
  if (!app.cvReviewedAt) {
    throw new AppError(400, 'CV_NOT_REVIEWED', 'Admin cần xác nhận đã xem CV trước khi duyệt giáo viên');
  }

  if (app.fullName?.trim()) {
    applicant.displayName = app.fullName.trim();
    await applicant.save();
  }
  if (app.avatarUrl) {
    applicant.avatar = app.avatarUrl;
    await applicant.save();
  }

  await updateAdminUserRole({
    actorUserId,
    targetUserId,
    role: 'teacher',
  });

  await upsertTeacherProfileFromApplication(targetUserId, {
    fullName: app.fullName,
    headline:
      app.headline?.trim() ||
      (app.organization ? `Giảng viên · ${app.organization}` : 'Giảng viên'),
    bio: app.bio,
    organization: app.organization,
    expertise: app.expertise,
    education: app.education,
    yearsExperience: app.yearsExperience,
    phone: app.phone,
    website: app.website,
    linkedin: app.linkedin,
    avatarUrl: app.avatarUrl,
  });

  app.status = 'approved';
  app.reviewedAt = new Date();
  app.reviewedByUserId = String(actorUserId);
  app.reviewNote = reviewNote;
  await app.save();

  const loginEmail = app.applicationEmail || applicant?.email;
  if (loginEmail) {
    await sendTeacherApplicationDecisionEmail({
      to: loginEmail,
      displayName: app.fullName || applicant.displayName,
      action: 'approve',
      loginEmail,
    });
  }

  void notifyTeacherApplicationDecision({
    userId: targetUserId,
    approved: true,
    reviewNote: '',
  });

  return formatApplication(app);
}

module.exports = {
  submitTeacherApplication,
  getMyApplicationStatus,
  listApplicationsForAdmin,
  markCvReviewed,
  reviewApplication,
  BIO_MIN,
  BIO_MAX,
  REJECT_NOTE_MIN,
};
