/** HttpOnly session cookie — JWT không lộ qua XSS trên web. */

const AUTH_COOKIE_NAME = 'galaxies_session';

function parseMaxAgeMs() {
  const raw = process.env.JWT_EXPIRES_IN || '7d';
  const m = String(raw).match(/^(\d+)([dhms])?$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = (m[2] || 'd').toLowerCase();
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'm') return n * 60 * 1000;
  return n * 1000;
}

function cookieBaseOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  if (!token) return;
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieBaseOptions(),
    maxAge: parseMaxAgeMs(),
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieBaseOptions());
}

/** Bearer trong body chỉ cho native/dev — web dùng cookie. */
function shouldExposeTokenInBody(req) {
  if (process.env.AUTH_EXPOSE_TOKEN_BODY === '1') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  const client = String(req?.headers?.['x-galaxies-client'] || '').toLowerCase();
  return client === 'native' || client === 'mobile';
}

function extractAuthToken(req) {
  const fromCookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (fromCookie && typeof fromCookie === 'string') return fromCookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

/** Raw HTTP upgrade (WS) — cookie-parser không chạy; parse Cookie header thủ công. */
function extractAuthTokenFromRequest(request) {
  const fromExpress = extractAuthToken(request);
  if (fromExpress) return fromExpress;
  const raw = request.headers?.cookie;
  if (!raw || typeof raw !== 'string') return null;
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === AUTH_COOKIE_NAME) {
      const value = rest.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

module.exports = {
  AUTH_COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  shouldExposeTokenInBody,
  extractAuthToken,
  extractAuthTokenFromRequest,
};
