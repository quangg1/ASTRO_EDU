/* eslint-disable no-restricted-imports -- Admin read-model: cross-feature aggregates for ops console. */
/**
 * Admin user ops read/write boundary.
 *
 * User admin screens need identity plus cascade deletes across courses,
 * payment, community, rewards and learning-path collections. Those foreign
 * model imports live here so admin services never touch another feature's
 * models directly.
 */
const mongoose = require('mongoose');
const User = require('../../auth/models/User');
const TeacherApplication = require('../../auth/models/TeacherApplication');
const Enrollment = require('../../courses/models/Enrollment');
const Order = require('../../payment/models/Order');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const AssignmentSubmission = require('../../courses/models/AssignmentSubmission');
const QuizAttempt = require('../../courses/models/QuizAttempt');
const TutorialProgress = require('../../courses/models/TutorialProgress');
const Notification = require('../../notifications/models/Notification');
const ModerationWarning = require('../../community/models/ModerationWarning');
const Post = require('../../community/models/Post');
const Comment = require('../../community/models/Comment');
const Vote = require('../../community/models/Vote');
const UserReward = require('../../rewards/models/UserReward');
const PromoRedemption = require('../../promotions/models/PromoRedemption');
const UserAchievement = require('../../rewards/models/UserAchievement');
const ShowcaseUnlock = require('../../rewards/models/ShowcaseUnlock');
const GemTransaction = require('../../rewards/models/GemTransaction');
const UserProgress = require('../../learning-path/models/UserProgress');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const Course = require('../../courses/models/Course');
const Cohort = require('../../courses/models/Cohort');

const ADMIN_USER_LIST_SELECT =
  'email displayName avatar provider role adminScopes accountStatus deactivatedAt deactivatedByUserId deactivationReason restoredAt createdAt';

const ADMIN_USER_DETAIL_SELECT =
  'email displayName avatar provider role accountStatus deactivatedAt deactivationReason createdAt';

function listUsers(filter, { skip, limit } = {}) {
  return User.find(filter)
    .select(ADMIN_USER_LIST_SELECT)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

const countUsers = (filter = {}) => User.countDocuments(filter);

function findUserByIdLean(userId, select = ADMIN_USER_LIST_SELECT) {
  return User.findById(userId).select(select).lean();
}

function findUserDocById(userId) {
  return User.findById(userId);
}

function findUserByIdAndUpdate(userId, update, { select = ADMIN_USER_LIST_SELECT } = {}) {
  return User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).select(select);
}

const deleteUserById = (userId) => User.findByIdAndDelete(userId);

const countAdmins = () => User.countDocuments({ role: 'admin' });

const listPostIdsByAuthor = (uid) => Post.find({ authorId: uid }).distinct('_id');

/**
 * Cascade wipe of user-owned rows across foreign collections (permanent delete).
 */
async function deleteAllUserOwnedData(uid, uidObj) {
  const postIds = await listPostIdsByAuthor(uid);
  await Promise.all([
    Enrollment.deleteMany({ userId: uid }),
    Order.deleteMany({ userId: uid }),
    CohortEnrollment.deleteMany({ userId: uid }),
    AssignmentSubmission.deleteMany({ userId: uid }),
    QuizAttempt.deleteMany({ userId: uid }),
    TutorialProgress.deleteMany({ userId: uid }),
    Notification.deleteMany({ userId: uid }),
    ModerationWarning.deleteMany({ userId: uid }),
    Vote.deleteMany({ userId: uid }),
    Comment.deleteMany({ $or: [{ authorId: uid }, { postId: { $in: postIds } }] }),
    Post.deleteMany({ authorId: uid }),
    UserReward.deleteMany({ userId: uid }),
    PromoRedemption.deleteMany({ userId: uid }),
    UserAchievement.deleteMany({ userId: uid }),
    ShowcaseUnlock.deleteMany({ userId: uid }),
    GemTransaction.deleteMany({ userId: uid }),
    UserProgress.deleteMany({ userId: uid }),
    LearningPathEvent.deleteMany({ userId: uid }),
    uidObj ? TeacherApplication.deleteMany({ userId: uidObj }) : Promise.resolve(),
  ]);
}

function toObjectIdOrNull(uid) {
  return mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : null;
}

async function loadUserDetailBundle(userId) {
  const user = await User.findById(userId).select(ADMIN_USER_DETAIL_SELECT).lean();
  if (!user) return null;

  const uid = String(user._id);
  const [ordersRaw, enrollments, cohortEnrollments, ur, gemTxs] = await Promise.all([
    Order.find({ userId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
    Enrollment.find({ userId: uid }).sort({ enrolledAt: -1 }).lean(),
    CohortEnrollment.find({ userId: uid }).sort({ joinedAt: -1 }).lean(),
    UserReward.findOne({ userId: uid }).lean(),
    GemTransaction.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const courseIds = [...new Set(enrollments.map((e) => String(e.courseId)))];
  const cohortIds = [...new Set(cohortEnrollments.map((e) => String(e.cohortId)))];
  const [courses, cohorts] = await Promise.all([
    courseIds.length
      ? Course.find({ _id: { $in: courseIds } })
          .select('title slug published')
          .lean()
      : [],
    cohortIds.length
      ? Cohort.find({ _id: { $in: cohortIds } })
          .select('title slug courseId status startAt')
          .lean()
      : [],
  ]);

  return {
    user,
    ordersRaw,
    enrollments,
    cohortEnrollments,
    userReward: ur,
    gemTransactions: gemTxs,
    courses,
    cohorts,
  };
}

module.exports = {
  ADMIN_USER_LIST_SELECT,
  listUsers,
  countUsers,
  findUserByIdLean,
  findUserDocById,
  findUserByIdAndUpdate,
  deleteUserById,
  countAdmins,
  deleteAllUserOwnedData,
  toObjectIdOrNull,
  loadUserDetailBundle,
};
