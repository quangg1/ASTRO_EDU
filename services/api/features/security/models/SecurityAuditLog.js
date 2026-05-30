const mongoose = require('mongoose');

const securityAuditLogSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, index: true },
    code: { type: String, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null, index: true },
    statusCode: { type: Number, default: null },
    userId: { type: String, default: null, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

securityAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SecurityAuditLog', securityAuditLogSchema);
