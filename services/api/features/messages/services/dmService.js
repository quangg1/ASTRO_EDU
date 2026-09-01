const mongoose = require('mongoose');
const {
  findAccountSummary,
  listProfileCards,
} = require('../../auth/services/userDirectoryService');
const DmConversation = require('../models/DmConversation');
const DmMessage = require('../models/DmMessage');
const { publishToUser } = require('../../notifications/ws/notificationHub');
const { notifyDirectMessage } = require('../../notifications/services/notificationService');
const { getAuthorSnippetsForIds } = require('../../users/publicProfileService');

function participantsKey(userIdA, userIdB) {
  const [a, b] = [String(userIdA), String(userIdB)].sort();
  return `${a}:${b}`;
}

function assertValidUserId(id) {
  const s = String(id || '').trim();
  if (!mongoose.Types.ObjectId.isValid(s)) {
    const err = new Error('Người dùng không hợp lệ');
    err.status = 400;
    throw err;
  }
  return s;
}

async function assertActiveUser(userId) {
  const account = await findAccountSummary(userId);
  if (!account?.isActive) {
    const err = new Error('Người dùng không khả dụng');
    err.status = 404;
    throw err;
  }
  return account;
}

async function getOrCreateConversation(userIdA, userIdB) {
  const a = assertValidUserId(userIdA);
  const b = assertValidUserId(userIdB);
  if (a === b) {
    const err = new Error('Không thể nhắn tin với chính mình');
    err.status = 400;
    throw err;
  }
  await Promise.all([assertActiveUser(a), assertActiveUser(b)]);

  const key = participantsKey(a, b);
  const sortedIds = [a, b].sort();
  let conv = await DmConversation.findOne({ participantsKey: key });
  if (!conv) {
    conv = await DmConversation.create({
      participantsKey: key,
      participantIds: sortedIds.map((id) => new mongoose.Types.ObjectId(id)),
      lastMessageAt: null,
      lastMessagePreview: '',
      lastSenderId: null,
    });
  }
  return conv;
}

function otherParticipantId(conv, myUserId) {
  const me = String(myUserId);
  const other = conv.participantIds.find((id) => String(id) !== me);
  return other ? String(other) : null;
}

async function listConversations(userId) {
  const me = String(userId);
  const rows = await DmConversation.find({ participantIds: new mongoose.Types.ObjectId(me) })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(80)
    .lean();

  const otherIds = rows.map((r) => otherParticipantId(r, me)).filter(Boolean);
  const snippets = await getAuthorSnippetsForIds(otherIds);
  const userById = new Map(
    (await listProfileCards(otherIds)).map((card) => [card.id, card]),
  );

  const unreadCounts = await Promise.all(
    rows.map(async (conv) => {
      const n = await DmMessage.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: new mongoose.Types.ObjectId(me) },
        readBy: { $ne: new mongoose.Types.ObjectId(me) },
      });
      return n;
    }),
  );

  return rows.map((conv, i) => {
    const otherId = otherParticipantId(conv, me);
    const u = userById.get(otherId || '');
    const snip = snippets.get(otherId || '');
    return {
      id: String(conv._id),
      otherUser: {
        id: otherId,
        displayName: (u?.displayName || '').trim() || 'Học viên',
        avatar: u?.avatar || snip?.authorAvatar || null,
        authorOverlayUrl: snip?.authorOverlayUrl || null,
        learnerTier: snip?.authorLearnerTier || null,
      },
      lastMessageAt: conv.lastMessageAt?.toISOString?.() || null,
      lastMessagePreview: conv.lastMessagePreview || '',
      lastSenderId: conv.lastSenderId ? String(conv.lastSenderId) : null,
      unreadCount: unreadCounts[i] || 0,
    };
  });
}

async function assertParticipant(conversationId, userId) {
  const conv = await DmConversation.findById(conversationId).lean();
  if (!conv) {
    const err = new Error('Cuộc trò chuyện không tồn tại');
    err.status = 404;
    throw err;
  }
  const me = String(userId);
  const ok = conv.participantIds.some((id) => String(id) === me);
  if (!ok) {
    const err = new Error('Không có quyền truy cập');
    err.status = 403;
    throw err;
  }
  return conv;
}

async function listMessages(conversationId, userId, { before, limit = 50 } = {}) {
  await assertParticipant(conversationId, userId);
  const q = { conversationId };
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(+d)) q.createdAt = { $lt: d };
  }
  const cap = Math.min(100, Math.max(1, Number(limit) || 50));
  const rows = await DmMessage.find(q).sort({ createdAt: -1 }).limit(cap).lean();
  rows.reverse();

  const me = String(userId);
  const unreadFromOther = rows.filter(
    (m) => String(m.senderId) !== me && !(m.readBy || []).some((id) => String(id) === me),
  );
  if (unreadFromOther.length) {
    await DmMessage.updateMany(
      { _id: { $in: unreadFromOther.map((m) => m._id) } },
      { $addToSet: { readBy: new mongoose.Types.ObjectId(me) } },
    );
  }

  return rows.map((m) => ({
    id: String(m._id),
    conversationId: String(m.conversationId),
    senderId: String(m.senderId),
    body: m.body,
    createdAt: m.createdAt?.toISOString?.() || null,
    isMine: String(m.senderId) === me,
  }));
}

function pushDmEvent(userId, payload) {
  publishToUser(userId, {
    type: 'dm',
    ...payload,
  });
}

async function sendDirectMessage(senderId, { recipientId, body, conversationId }) {
  const me = String(senderId);
  let conv;
  if (conversationId) {
    conv = await assertParticipant(conversationId, me);
  } else {
    const rid = assertValidUserId(recipientId);
    conv = await getOrCreateConversation(me, rid);
  }

  const text = String(body || '').trim();
  if (!text) {
    const err = new Error('Nội dung tin nhắn trống');
    err.status = 400;
    throw err;
  }
  if (text.length > 4000) {
    const err = new Error('Tin nhắn quá dài');
    err.status = 400;
    throw err;
  }

  const otherId = otherParticipantId(conv, me);
  if (!otherId) {
    const err = new Error('Cuộc trò chuyện không hợp lệ');
    err.status = 400;
    throw err;
  }

  const msg = await DmMessage.create({
    conversationId: conv._id,
    senderId: new mongoose.Types.ObjectId(me),
    body: text,
    readBy: [new mongoose.Types.ObjectId(me)],
  });

  const preview = text.length > 200 ? `${text.slice(0, 197)}…` : text;
  await DmConversation.updateOne(
    { _id: conv._id },
    {
      $set: {
        lastMessageAt: msg.createdAt,
        lastMessagePreview: preview,
        lastSenderId: msg.senderId,
      },
    },
  );

  const base = {
    id: String(msg._id),
    conversationId: String(conv._id),
    senderId: me,
    body: msg.body,
    createdAt: msg.createdAt?.toISOString?.() || null,
  };

  pushDmEvent(otherId, {
    conversationId: String(conv._id),
    message: { ...base, isMine: false },
  });
  pushDmEvent(me, {
    conversationId: String(conv._id),
    message: { ...base, isMine: true },
  });

  const sender = await findAccountSummary(me);
  void notifyDirectMessage({
    userId: otherId,
    senderName: (sender?.displayName || '').trim() || 'Học viên',
    messagePreview: preview,
    conversationId: String(conv._id),
    senderId: me,
  }).catch((err) => console.error('notifyDirectMessage error:', err));

  return {
    conversationId: String(conv._id),
    message: { ...base, isMine: true },
    otherUserId: otherId,
  };
}

async function openConversationWithUser(userId, otherUserId) {
  const conv = await getOrCreateConversation(userId, otherUserId);
  return { conversationId: String(conv._id) };
}

module.exports = {
  listConversations,
  listMessages,
  sendDirectMessage,
  openConversationWithUser,
  getOrCreateConversation,
};
