const BLOCKED_PATH_RE = [
  /\.\./,
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/phpmyadmin/i,
  /\/\.aws/i,
  /<script/i,
];

const BLOCKED_METHODS = new Set(['TRACE', 'TRACK']);

function requestGuardMiddleware(req, res, next) {
  if (BLOCKED_METHODS.has(req.method)) {
    res.locals.securityEvent = { eventType: 'blocked_request', code: 'METHOD_NOT_ALLOWED' };
    return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' });
  }

  const path = `${req.originalUrl || req.path || ''}`;
  if (path.length > 4096) {
    res.locals.securityEvent = { eventType: 'blocked_request', code: 'URI_TOO_LONG' };
    return res.status(414).json({ success: false, code: 'URI_TOO_LONG', error: 'URI quá dài' });
  }

  for (const re of BLOCKED_PATH_RE) {
    if (re.test(path)) {
      res.locals.securityEvent = { eventType: 'blocked_request', code: 'BLOCKED_PATH' };
      return res.status(400).json({ success: false, code: 'BLOCKED_PATH', error: 'Yêu cầu không hợp lệ' });
    }
  }

  return next();
}

module.exports = { requestGuardMiddleware };
