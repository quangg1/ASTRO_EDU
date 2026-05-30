const rateLimit = require('express-rate-limit');
const { recordSecurityEvent } = require('./securityAudit');

function limiterDisabled() {
  return process.env.DISABLE_RATE_LIMIT === '1' || process.env.NODE_ENV === 'test';
}

function wrapLimiter(options) {
  if (limiterDisabled()) {
    return (_req, _res, next) => next();
  }
  const { code, message, ...rest } = options;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      recordSecurityEvent(req, {
        eventType: 'rate_limit',
        code: code || 'RATE_LIMIT',
        statusCode: 429,
        meta: { limiter: code },
      });
      res.status(429).json({
        success: false,
        code: code || 'RATE_LIMIT',
        error: message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      });
    },
    ...rest,
  });
}

/** Login / forgot-password — chống brute-force */
const authCredentialLimiter = wrapLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: 'AUTH_RATE_LIMIT',
  message: 'Quá nhiều lần đăng nhập. Thử lại sau 15 phút.',
});

/** Register / resend verification — chống spam */
const authSignupLimiter = wrapLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  code: 'AUTH_SIGNUP_RATE_LIMIT',
  message: 'Quá nhiều yêu cầu đăng ký/xác minh. Thử lại sau một giờ.',
});

/** Verify email code — cho phép vài lần nhập sai */
const authVerifyEmailLimiter = wrapLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  code: 'AUTH_VERIFY_RATE_LIMIT',
  message: 'Quá nhiều lần nhập mã. Thử lại sau 15 phút.',
});

/** API chung theo IP */
const apiGlobalLimiter = wrapLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  code: 'API_RATE_LIMIT',
  message: 'Quá nhiều yêu cầu API. Thử lại sau.',
});

/** Upload (mọi route /upload*) */
const uploadLimiter = wrapLimiter({
  windowMs: 60 * 60 * 1000,
  max: 40,
  code: 'UPLOAD_RATE_LIMIT',
  message: 'Quá nhiều lần tải file lên. Thử lại sau một giờ.',
});

/** Agent chat — lớp ngoài (còn limit theo tier trong pipeline) */
const agentLimiter = wrapLimiter({
  windowMs: 60 * 60 * 1000,
  max: 80,
  code: 'AGENT_RATE_LIMIT',
  message: 'Quá nhiều tin nhắn agent. Thử lại sau.',
});

/** AI generate quiz (GV) */
const aiGenerateLimiter = wrapLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  code: 'AI_GENERATE_RATE_LIMIT',
  message: 'Quá nhiều lần sinh quiz AI. Thử lại sau.',
});

/** Learning path analytics batch — chống flood */
const lpEventsLimiter = wrapLimiter({
  windowMs: 60 * 1000,
  max: 30,
  code: 'LP_EVENTS_RATE_LIMIT',
  message: 'Quá nhiều sự kiện analytics. Thử lại sau.',
});

const courseEventsLimiter = wrapLimiter({
  windowMs: 60 * 1000,
  max: 30,
  code: 'COURSE_EVENTS_RATE_LIMIT',
  message: 'Quá nhiều sự kiện học khóa. Thử lại sau.',
});

module.exports = {
  authCredentialLimiter,
  authSignupLimiter,
  authVerifyEmailLimiter,
  apiGlobalLimiter,
  uploadLimiter,
  agentLimiter,
  aiGenerateLimiter,
  lpEventsLimiter,
  courseEventsLimiter,
};
