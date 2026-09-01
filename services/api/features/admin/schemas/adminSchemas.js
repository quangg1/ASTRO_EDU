const { z, schemas } = require('../../../shared/http');
const { VALID_ROLES } = require('../adminBroadcastService');
const { RANGE_TO_DAYS, DEFAULT_RANGE } = require('../services/analytics/analyticsRange');

const RANGES = Object.keys(RANGE_TO_DAYS);
const DEPTHS = ['beginner', 'explorer', 'researcher'];

/** Unknown ranges fall back to the default instead of rejecting the request. */
const rangeQuery = (defaultRange = DEFAULT_RANGE) =>
  z.object({
    range: z
      .string()
      .trim()
      .optional()
      .transform((value) => (RANGES.includes(value) ? value : defaultRange)),
  });

const learningPathAnalyticsQuery = rangeQuery().extend({
  moduleId: z.string().trim().max(120).optional().default(''),
  depth: z
    .string()
    .trim()
    .optional()
    .transform((value) => (DEPTHS.includes(value) ? value : '')),
});

/** Blank filters mean "no filter", not "match empty string". */
const optionalFilter = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const listUsersQuery = z.object({
  q: z.string().trim().max(200).optional().default(''),
  role: optionalFilter(40),
  accountStatus: optionalFilter(40),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const idParams = z.object({ id: schemas.objectId });
const userIdParams = idParams;
const courseIdParams = idParams;

const updateRoleBody = z.object({ role: schemas.trimmedString(40, 'Vai trò') });

const updateScopesBody = z.object({
  adminScopes: z.array(z.string().trim().min(1).max(40)).max(32),
});

const updateStatusBody = z.object({
  accountStatus: schemas.trimmedString(40, 'Trạng thái tài khoản'),
  reason: z.string().trim().max(1000).optional(),
});

const deleteUserBody = z.object({
  confirmEmail: z.string().trim().max(320).optional(),
  reason: z.string().trim().max(1000).optional(),
});

const teacherApplicationsQuery = z.object({
  status: z.string().trim().max(40).default('pending'),
});

const applicationIdParams = z.object({ id: schemas.objectId });

const reviewApplicationBody = z.object({
  action: schemas.trimmedString(40, 'Hành động'),
  note: z.string().trim().max(2000).optional(),
});

/** Overlong text is truncated rather than rejected, matching the admin UI. */
const truncated = (max) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value || '').slice(0, max));

const broadcastBody = z.object({
  titleVi: z
    .string({ required_error: 'Tiêu đề là bắt buộc' })
    .trim()
    .min(1, 'Tiêu đề là bắt buộc')
    .transform((value) => value.slice(0, 200)),
  bodyVi: truncated(2000),
  href: truncated(500).transform((value) => value || null),
  roles: z
    .array(z.string())
    .optional()
    .transform((roles) =>
      roles ? roles.filter((role) => VALID_ROLES.includes(String(role))) : null,
    ),
});

/** Body chỉ mang lý do; nhiều lệnh admin được gọi không kèm body. */
const reasonBody = z.preprocess(
  (value) => (value && typeof value === 'object' ? value : {}),
  z.looseObject({ reason: z.string().trim().max(1000).optional() }),
);

/** Cấp/thu quyền học: lý do trống được thay bằng nhãn mặc định để nhật ký đọc được. */
const enrollmentBody = (idField, defaultGrantReason) => ({
  grant: z.object({
    userId: schemas.trimmedString(64, 'userId'),
    [idField]: schemas.trimmedString(64, idField),
    reason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((value) => value || defaultGrantReason),
  }),
  revoke: z.object({
    userId: schemas.trimmedString(64, 'userId'),
    [idField]: schemas.trimmedString(64, idField),
    reason: z.string().trim().max(1000).optional().default(''),
  }),
});

const catalogEnrollment = enrollmentBody('courseId', 'Admin cấp quyền tự học');
const cohortEnrollment = enrollmentBody('cohortId', 'Admin cấp quyền lớp');

const listOrdersQuery = z.object({
  status: z.string().trim().max(40).default('all'),
  q: z.string().trim().max(200).optional().default(''),
  courseSlug: optionalFilter(200),
  from: optionalFilter(40),
  to: optionalFilter(40),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

const txnRefParams = z.object({ txnRef: schemas.trimmedString(120, 'Mã giao dịch') });

const orderNoteBody = z.object({ adminNote: z.string().max(2000).optional() });

/** Hoàn tiền mặc định thu hồi quyền học; chỉ `false` tường minh mới giữ quyền. */
const refundOrderBody = z.looseObject({
  reason: z.string().trim().max(1000).optional(),
  revokeAccess: z.unknown().transform((value) => value !== false),
});

const listCoursesQuery = z.object({
  q: z.string().trim().max(200).optional().default(''),
  published: z.string().trim().max(20).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

const coursePublishedBody = z.looseObject({
  published: z.unknown().transform(Boolean),
  reason: z.string().trim().max(1000).optional(),
});

const auditLogQuery = z.object({
  source: z.string().trim().max(40).default('admin'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const moderationQueueQuery = z.object({
  status: z.string().trim().max(40).default('open'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

module.exports = {
  rangeQuery,
  learningPathAnalyticsQuery,
  listUsersQuery,
  userIdParams,
  courseIdParams,
  updateRoleBody,
  updateScopesBody,
  updateStatusBody,
  deleteUserBody,
  teacherApplicationsQuery,
  applicationIdParams,
  reviewApplicationBody,
  broadcastBody,
  reasonBody,
  catalogEnrollment,
  cohortEnrollment,
  listOrdersQuery,
  txnRefParams,
  orderNoteBody,
  refundOrderBody,
  listCoursesQuery,
  coursePublishedBody,
  auditLogQuery,
  moderationQueueQuery,
};
