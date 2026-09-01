const { z } = require('zod');
const ENV = require('../../../shared/envNames');

const stripTrailingSlash = (value) => (value ? String(value).replace(/\/$/, '') : '');

const requiredString = (name) =>
  z
    .string({ required_error: `Thiếu biến môi trường bắt buộc: ${name}` })
    .trim()
    .min(1, `Thiếu biến môi trường bắt buộc: ${name}`);

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || '');

const optionalBool = z
  .string()
  .trim()
  .optional()
  .transform((value) => /^(1|true|yes)$/i.test(value || ''));

const optionalUrl = optionalString.transform(stripTrailingSlash);

/**
 * Whole-process env contract. Required vars fail fast at boot; optional
 * integrations degrade gracefully (mail, S3, VNPay, AI are feature-flagged by
 * presence of their keys).
 */
const envSchema = z.object({
  [ENV.PORT]: requiredString(ENV.PORT)
    .pipe(z.coerce.number().int().positive(`Biến ${ENV.PORT} phải là số cổng hợp lệ`)),
  [ENV.MONGODB_URI]: requiredString(ENV.MONGODB_URI),
  [ENV.CLIENT_URL]: requiredString(ENV.CLIENT_URL).transform(stripTrailingSlash),
  [ENV.JWT_SECRET]: requiredString(ENV.JWT_SECRET),
  [ENV.INTERNAL_API_SECRET]: requiredString(ENV.INTERNAL_API_SECRET),

  [ENV.NODE_ENV]: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      ['development', 'test', 'production'].includes(value) ? value : 'development',
    ),
  [ENV.API_PUBLIC_URL]: optionalUrl,
  [ENV.AI_SERVICE_URL]: optionalUrl,
  [ENV.EMBEDDING_URL]: optionalUrl,

  [ENV.MAIL_FROM]: optionalString,
  [ENV.SMTP_HOST]: optionalString,
  [ENV.BREVO_API_KEY]: optionalString,
  [ENV.RESEND_API_KEY]: optionalString,

  [ENV.S3_MEDIA_BUCKET]: optionalString,
  [ENV.AWS_REGION]: optionalString,
  [ENV.MEDIA_CDN_URL]: optionalUrl,

  [ENV.VNPAY_TMN_CODE]: optionalString,
  [ENV.VNPAY_HASH_SECRET]: optionalString,
  [ENV.VNPAY_TEST_MODE]: optionalBool,
});

/**
 * Parses `process.env` into a structured, validated config object.
 * Throws a single error listing every problem instead of failing one var at a time.
 */
function validateApiEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const name = issue.path.join('.');
      return issue.message.includes(name) ? issue.message : `${name}: ${issue.message}`;
    });
    throw new Error(`Cấu hình môi trường không hợp lệ:\n  - ${problems.join('\n  - ')}`);
  }

  const env = result.data;

  return {
    nodeEnv: env[ENV.NODE_ENV],
    isProduction: env[ENV.NODE_ENV] === 'production',
    port: env[ENV.PORT],
    mongodbUri: env[ENV.MONGODB_URI],
    clientUrl: env[ENV.CLIENT_URL],
    jwtSecret: env[ENV.JWT_SECRET],
    internalApiSecret: env[ENV.INTERNAL_API_SECRET],
    apiPublicUrl: env[ENV.API_PUBLIC_URL],
    aiServiceUrl: env[ENV.AI_SERVICE_URL],
    embeddingUrl: env[ENV.EMBEDDING_URL],
    mail: {
      from: env[ENV.MAIL_FROM],
      configured: Boolean(env[ENV.SMTP_HOST] || env[ENV.BREVO_API_KEY] || env[ENV.RESEND_API_KEY]),
    },
    storage: {
      bucket: env[ENV.S3_MEDIA_BUCKET],
      region: env[ENV.AWS_REGION],
      cdnUrl: env[ENV.MEDIA_CDN_URL],
      configured: Boolean(env[ENV.S3_MEDIA_BUCKET]),
    },
    vnpay: {
      tmnCode: env[ENV.VNPAY_TMN_CODE],
      hashSecret: env[ENV.VNPAY_HASH_SECRET],
      testMode: env[ENV.VNPAY_TEST_MODE],
      configured: Boolean(env[ENV.VNPAY_TMN_CODE] && env[ENV.VNPAY_HASH_SECRET]),
    },
  };
}

module.exports = { validateApiEnv, envSchema, ENV };
