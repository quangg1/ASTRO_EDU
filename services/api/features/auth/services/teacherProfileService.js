const TeacherProfile = require('../models/TeacherProfile');
const User = require('../models/User');
const { AppError } = require('../../../shared/errors');

function normalizeExpertise(raw) {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 24);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
}

function formatPublicProfile(doc, user) {
  if (!doc) return null;
  const name =
    doc.fullName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Giảng viên';
  return {
    userId: String(doc.userId),
    fullName: name,
    headline: doc.headline || '',
    bio: doc.bio || '',
    organization: doc.organization || '',
    expertise: Array.isArray(doc.expertise) ? doc.expertise : [],
    education: doc.education || '',
    yearsExperience: doc.yearsExperience ?? null,
    website: doc.website || '',
    linkedin: doc.linkedin || '',
    avatarUrl: doc.avatarUrl || user?.avatar || null,
    email: user?.email || null,
    verified: Boolean(doc.verifiedAt),
  };
}

async function getTeacherProfileByUserId(userId, { requirePublished = false } = {}) {
  const doc = await TeacherProfile.findOne({ userId }).lean();
  if (!doc) return null;
  if (requirePublished && doc.published === false) return null;
  const user = await User.findById(userId).select('email displayName avatar role').lean();
  if (!user || user.role !== 'teacher') return null;
  return formatPublicProfile(doc, user);
}

/** Hồ sơ công khai trên trang khóa học — fallback từ User nếu chưa có TeacherProfile đầy đủ. */
async function resolveCourseTeacherPublic(userId, { requirePublished = true } = {}) {
  if (!userId) return null;
  const profile = await getTeacherProfileByUserId(userId, { requirePublished });
  if (profile) return profile;

  const user = await User.findById(userId).select('email displayName avatar role').lean();
  if (!user || user.role !== 'teacher') return null;

  return {
    userId: String(userId),
    fullName: user.displayName?.trim() || user.email?.split('@')[0] || 'Giảng viên',
    headline: '',
    bio: '',
    organization: '',
    expertise: [],
    education: '',
    yearsExperience: null,
    website: '',
    linkedin: '',
    avatarUrl: user.avatar || null,
    email: user.email || null,
    verified: false,
  };
}

async function upsertTeacherProfileFromApplication(userId, payload) {
  const expertise = normalizeExpertise(payload.expertise);
  const set = {
    fullName: String(payload.fullName || '').trim().slice(0, 200),
    bio: String(payload.bio || '').trim().slice(0, 8000),
    organization: String(payload.organization || '').trim().slice(0, 500),
    expertise,
    education: String(payload.education || '').trim().slice(0, 2000),
    yearsExperience:
      payload.yearsExperience != null && Number.isFinite(Number(payload.yearsExperience))
        ? Math.min(80, Math.max(0, Number(payload.yearsExperience)))
        : null,
    phone: String(payload.phone || '').trim().slice(0, 40),
    website: String(payload.website || '').trim().slice(0, 500),
    linkedin: String(payload.linkedin || '').trim().slice(0, 500),
    avatarUrl: payload.avatarUrl || null,
    published: true,
    verifiedAt: new Date(),
  };
  if (payload.headline != null) {
    set.headline = String(payload.headline || '').trim().slice(0, 300);
  }
  const doc = await TeacherProfile.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true },
  );
  return doc;
}

async function getMyTeacherProfile(userId) {
  const user = await User.findById(userId).select('email displayName avatar role').lean();
  if (!user || user.role !== 'teacher') {
    throw new AppError(403, 'NOT_A_TEACHER', 'Chỉ giáo viên mới có hồ sơ giảng dạy');
  }
  let doc = await TeacherProfile.findOne({ userId }).lean();
  if (!doc) {
    doc = await TeacherProfile.create({
      userId,
      fullName: user.displayName || '',
      avatarUrl: user.avatar || null,
      published: true,
      verifiedAt: new Date(),
    });
    doc = doc.toObject();
  }
  return formatPublicProfile(doc, user);
}

async function updateMyTeacherProfile(userId, body) {
  const user = await User.findById(userId).select('role displayName avatar email').lean();
  if (!user || user.role !== 'teacher') {
    throw new AppError(403, 'NOT_A_TEACHER', 'Chỉ giáo viên mới chỉnh sửa hồ sơ');
  }
  const set = {};
  if (typeof body.fullName === 'string') set.fullName = body.fullName.trim().slice(0, 200);
  if (typeof body.headline === 'string') set.headline = body.headline.trim().slice(0, 300);
  if (typeof body.bio === 'string') set.bio = body.bio.trim().slice(0, 8000);
  if (typeof body.organization === 'string') set.organization = body.organization.trim().slice(0, 500);
  if (body.expertise !== undefined) set.expertise = normalizeExpertise(body.expertise);
  if (typeof body.education === 'string') set.education = body.education.trim().slice(0, 2000);
  if (body.yearsExperience !== undefined) {
    const n = Number(body.yearsExperience);
    set.yearsExperience = Number.isFinite(n) ? Math.min(80, Math.max(0, n)) : null;
  }
  if (typeof body.phone === 'string') set.phone = body.phone.trim().slice(0, 40);
  if (typeof body.website === 'string') set.website = body.website.trim().slice(0, 500);
  if (typeof body.linkedin === 'string') set.linkedin = body.linkedin.trim().slice(0, 500);
  if (typeof body.avatarUrl === 'string') {
    set.avatarUrl = body.avatarUrl.trim() || null;
    await User.findByIdAndUpdate(userId, { $set: { avatar: set.avatarUrl } });
  }
  if (typeof body.published === 'boolean') set.published = body.published;

  const doc = await TeacherProfile.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId, verifiedAt: new Date() } },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const freshUser = await User.findById(userId).select('email displayName avatar role').lean();
  if (set.fullName && freshUser) {
    await User.findByIdAndUpdate(userId, { $set: { displayName: set.fullName } });
    freshUser.displayName = set.fullName;
  }
  return formatPublicProfile(doc, freshUser);
}

module.exports = {
  getTeacherProfileByUserId,
  resolveCourseTeacherPublic,
  upsertTeacherProfileFromApplication,
  getMyTeacherProfile,
  updateMyTeacherProfile,
  formatPublicProfile,
  normalizeExpertise,
};
