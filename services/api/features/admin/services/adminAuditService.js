const AdminActionLog = require('../models/AdminActionLog');
const GemEconomyAuditLog = require('../../rewards/models/GemEconomyAuditLog');
const SecurityAuditLog = require('../../security/models/SecurityAuditLog');
const { labelAdminAction, labelGemEconomyAction } = require('../lib/adminLabelsVi');

async function listAdminAuditLog({ source = 'all', page = 1, limit = 50 }) {
  const take = Math.min(100, Math.max(1, limit));
  const skip = Math.max(0, (Math.max(1, page) - 1) * take);

  if (source === 'gem') {
    const [rows, total] = await Promise.all([
      GemEconomyAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      GemEconomyAuditLog.countDocuments(),
    ]);
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        source: 'gem',
        action: r.action,
        actionLabel: labelGemEconomyAction(r.action),
        actorUserId: r.actorUserId,
        targetId: r.targetUserId || null,
        reason: r.reason,
        createdAt: r.createdAt,
        payload: r.payload || {},
      })),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  if (source === 'security') {
    const [rows, total] = await Promise.all([
      SecurityAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      SecurityAuditLog.countDocuments(),
    ]);
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        source: 'security',
        action: r.eventType || r.action || 'security_event',
        actionLabel: r.eventType || 'security',
        actorUserId: r.userId || null,
        targetId: r.path || null,
        reason: r.meta ? JSON.stringify(r.meta).slice(0, 500) : '',
        createdAt: r.createdAt,
        payload: { statusCode: r.statusCode, ip: r.ip },
      })),
      total,
      page: Math.max(1, page),
      limit: take,
    };
  }

  const [rows, total] = await Promise.all([
    AdminActionLog.find().sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    AdminActionLog.countDocuments(),
  ]);

  return {
    items: rows.map((r) => ({
      id: String(r._id),
      source: 'admin',
      action: r.action,
      actionLabel: labelAdminAction(r.action),
      actorUserId: r.actorUserId,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      createdAt: r.createdAt,
      payload: r.payload || {},
    })),
    total,
    page: Math.max(1, page),
    limit: take,
  };
}

module.exports = { listAdminAuditLog };
