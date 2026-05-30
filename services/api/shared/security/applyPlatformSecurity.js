const helmet = require('helmet');
const { requestGuardMiddleware } = require('./requestGuard');
const { securityAuditMiddleware } = require('./securityAudit');
const {
  authCredentialLimiter,
  authSignupLimiter,
  authVerifyEmailLimiter,
  apiGlobalLimiter,
  uploadLimiter,
  aiGenerateLimiter,
  lpEventsLimiter,
} = require('./rateLimiters');

/**
 * Gắn middleware bảo mật toàn cục (Phase A) + rate limit theo nhóm route.
 * @param {import('express').Express} app
 */
function applyPlatformSecurity(app) {
  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(requestGuardMiddleware);
  app.use(apiGlobalLimiter);

  app.use('/auth/login', authCredentialLimiter);
  app.use('/auth/forgot-password', authCredentialLimiter);
  app.use('/auth/reset-password', authCredentialLimiter);
  app.use('/auth/register', authSignupLimiter);
  app.use('/auth/register/resend-verification', authSignupLimiter);
  app.use('/auth/register/verify-email', authVerifyEmailLimiter);
  app.use('/auth/firebase', authCredentialLimiter);

  app.use('/upload', uploadLimiter);
  // Agent chat limit gắn trên POST /message trong features/agent (không chặn prefetch/snapshot/coach).
  app.use('/api/learning-path/editor/generate-quiz', aiGenerateLimiter);
  app.use('/api/learning-path/events/batch', lpEventsLimiter);
}

module.exports = { applyPlatformSecurity };
