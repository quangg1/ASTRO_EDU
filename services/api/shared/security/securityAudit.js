const SecurityAuditLog = require('../../features/security/models/SecurityAuditLog');

const AUDITED_STATUS = new Set([401, 403, 429]);

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * @param {import('express').Request} req
 * @param {{ eventType: string, code?: string, statusCode?: number, meta?: object }} payload
 */
function recordSecurityEvent(req, payload) {
  const row = {
    eventType: payload.eventType,
    code: payload.code || null,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: payload.statusCode ?? null,
    userId: req.userId ? String(req.userId) : null,
    ip: clientIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 512) : null,
    requestId: req.requestId || null,
    meta: payload.meta || null,
  };

  req.logger?.warn('security_event', row);

  void SecurityAuditLog.create(row).catch((err) => {
    req.logger?.error('security_audit_persist_failed', { error: err.message });
  });
}

function securityAuditMiddleware(req, res, next) {
  res.on('finish', () => {
    const status = res.statusCode;
    if (!AUDITED_STATUS.has(status) && !res.locals.securityEvent) return;

    const fromLocals = res.locals.securityEvent || {};
    recordSecurityEvent(req, {
      eventType: fromLocals.eventType || (status === 429 ? 'rate_limit' : 'access_denied'),
      code: fromLocals.code || (status === 429 ? 'RATE_LIMIT' : status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'),
      statusCode: status,
      meta: fromLocals.meta,
    });
  });
  next();
}

module.exports = {
  recordSecurityEvent,
  securityAuditMiddleware,
  clientIp,
};
