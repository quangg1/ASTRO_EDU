const mongoose = require('mongoose');
const User = require('../auth/models/User');
const UserReward = require('../rewards/models/UserReward');
const ShopItem = require('../rewards/models/ShopItem');
const Post = require('../community/models/Post');
const Comment = require('../community/models/Comment');
const {
  getLearnerTierByEarned,
  formatTierPublic,
} = require('../rewards/constants/learnerTiers');
const { getOverlayUrl, isAvatarDecorationItem } = require('../rewards/constants/avatarDecoration');

function toObjectIds(ids) {
  const out = [];
  for (const raw of ids) {
    const s = String(raw || '').trim();
    if (!s || !mongoose.Types.ObjectId.isValid(s)) continue;
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

async function resolveEquippedOverlays(userIds) {
  const rewards = await UserReward.find({ userId: { $in: userIds } })
    .select('userId equippedDecorationSkuId totalGemsEarned')
    .lean();
  const skuIds = [
    ...new Set(
      rewards.map((r) => r.equippedDecorationSkuId).filter(Boolean),
    ),
  ];
  const items = skuIds.length
    ? await ShopItem.find({ skuId: { $in: skuIds } }).lean()
    : [];
  const overlayBySku = new Map();
  for (const item of items) {
    if (isAvatarDecorationItem(item)) {
      overlayBySku.set(item.skuId, getOverlayUrl(item.metadata));
    }
  }
  const rewardByUser = new Map(rewards.map((r) => [String(r.userId), r]));
  const overlayByUser = new Map();
  for (const uid of userIds) {
    const r = rewardByUser.get(uid);
    const sku = r?.equippedDecorationSkuId;
    overlayByUser.set(uid, sku ? overlayBySku.get(sku) || null : null);
  }
  return { rewardByUser, overlayByUser };
}

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

  const objectIds = toObjectIds(stringIds);
  const users = objectIds.length
    ? await User.find({ _id: { $in: objectIds }, accountStatus: { $ne: 'deactivated' } })
        .select('displayName avatar role')
        .lean()
    : [];

  const { rewardByUser, overlayByUser } = await resolveEquippedOverlays(stringIds);

  const map = new Map();
  for (const u of users) {
    const id = String(u._id);
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

  const user = await User.findById(id)
    .select('displayName avatar role createdAt accountStatus')
    .lean();
  if (!user || user.accountStatus === 'deactivated') {
    const err = new Error('Không tìm thấy hồ sơ');
    err.status = 404;
    throw err;
  }

  const uid = String(user._id);
  const [reward, postCount, commentCount] = await Promise.all([
    UserReward.findOne({ userId: uid }).select('totalGemsEarned equippedDecorationSkuId').lean(),
    Post.countDocuments({ authorId: uid }),
    Comment.countDocuments({ authorId: uid }),
  ]);

  let equippedOverlayUrl = null;
  const equippedSku = reward?.equippedDecorationSkuId;
  if (equippedSku) {
    const item = await ShopItem.findOne({ skuId: equippedSku }).lean();
    if (item && isAvatarDecorationItem(item)) {
      equippedOverlayUrl = getOverlayUrl(item.metadata);
    }
  }

  const totalGemsEarned = reward?.totalGemsEarned ?? 0;
  const learnerTier = formatPublicLearnerTier(totalGemsEarned);

  return {
    id: uid,
    displayName: (user.displayName || '').trim() || 'Học viên',
    avatar: user.avatar || null,
    equippedOverlayUrl,
    role: user.role || 'student',
    memberSince: user.createdAt?.toISOString?.() || null,
    learnerTier,
    totalGemsEarned,
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
