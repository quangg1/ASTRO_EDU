const mongoose = require('mongoose');
const {
  listPublicAuthorCards,
  findPublicProfileUser,
} = require('../auth/services/userDirectoryService');
const {
  resolveEquippedOverlaysForUsers,
  getPublicRewardMeta,
} = require('../rewards/services/avatarDecorationService');
const {
  countPostsByAuthor,
  countCommentsByAuthor,
} = require('../community/services/communityReadService');
const {
  getLearnerTierByEarned,
  formatTierPublic,
} = require('../rewards/constants/learnerTiers');
const { getLearnerProfileForPublic } = require('./services/learnerProfileService');

function formatPublicLearnerTier(totalGemsEarned) {
  const tier = getLearnerTierByEarned(totalGemsEarned ?? 0);
  return formatTierPublic(tier);
}

/**
 * Snippet gắn vào post/comment — avatar, overlay, hạng Learner.
 */
async function getAuthorSnippetsForIds(authorIds) {
  const stringIds = [...new Set(authorIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!stringIds.length) return new Map();

  const users = await listPublicAuthorCards(stringIds);
  const { rewardByUser, overlayByUser } = await resolveEquippedOverlaysForUsers(stringIds);

  const map = new Map();
  for (const u of users) {
    const id = String(u.id);
    const reward = rewardByUser.get(id);
    const total = reward?.totalGemsEarned ?? 0;
    map.set(id, {
      authorAvatar: u.avatar || null,
      authorOverlayUrl: overlayByUser.get(id) || null,
      authorLearnerTier: formatPublicLearnerTier(total),
      authorRole: u.role || 'student',
    });
  }
  return map;
}

function applyAuthorSnippet(entity, snippets) {
  const id = String(entity.authorId || '').trim();
  const snippet = snippets.get(id);
  if (!snippet) return entity;
  return {
    ...entity,
    authorAvatar: snippet.authorAvatar,
    authorOverlayUrl: snippet.authorOverlayUrl,
    authorLearnerTier: snippet.authorLearnerTier,
    authorRole: snippet.authorRole,
  };
}

async function enrichPostsWithAuthors(posts) {
  const list = Array.isArray(posts) ? posts : [];
  const snippets = await getAuthorSnippetsForIds(list.map((p) => p.authorId));
  return list.map((p) => applyAuthorSnippet(p, snippets));
}

async function enrichCommentsWithAuthors(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const snippets = await getAuthorSnippetsForIds(list.map((c) => c.authorId));
  return list.map((c) => applyAuthorSnippet(c, snippets));
}

async function getPublicProfile(userId) {
  const id = String(userId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Người dùng không hợp lệ');
    err.status = 400;
    throw err;
  }

  const user = await findPublicProfileUser(id);
  if (!user || user.accountStatus === 'deactivated') {
    const err = new Error('Không tìm thấy hồ sơ');
    err.status = 404;
    throw err;
  }

  const uid = user.id;
  const [rewardMeta, postCount, commentCount] = await Promise.all([
    getPublicRewardMeta(uid),
    countPostsByAuthor(uid),
    countCommentsByAuthor(uid),
  ]);

  const totalGemsEarned = rewardMeta.totalGemsEarned ?? 0;
  const learnerTier = formatPublicLearnerTier(totalGemsEarned);
  const learnerProfile = await getLearnerProfileForPublic(uid);

  return {
    id: uid,
    displayName: (user.displayName || '').trim() || 'Học viên',
    avatar: user.avatar || null,
    equippedOverlayUrl: rewardMeta.equippedOverlayUrl,
    role: user.role || 'student',
    memberSince: user.createdAt?.toISOString?.() || null,
    learnerTier,
    totalGemsEarned,
    learnerProfile,
    stats: {
      postCount,
      commentCount,
    },
  };
}

module.exports = {
  getPublicProfile,
  getAuthorSnippetsForIds,
  enrichPostsWithAuthors,
  enrichCommentsWithAuthors,
};
