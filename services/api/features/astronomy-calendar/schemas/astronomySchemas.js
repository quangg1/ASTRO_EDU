const { z } = require('../../../shared/http');

const now = () => new Date();

/**
 * Thiếu tham số thì hiểu là tháng hiện tại — trang lịch mở lần đầu không truyền gì.
 * Các tham số vị trí (`preset`, `lat`, `lon`) được `resolveObserverFromQuery` xử lý
 * nên schema cố tình để lọt qua.
 */
const blank = (value) => value === undefined || value === '';

const monthQuery = z.looseObject({
  year: z.unknown().transform((value) => (blank(value) ? now().getFullYear() : value)),
  month: z.unknown().transform((value) => (blank(value) ? now().getMonth() + 1 : value)),
});

const eventIdParams = z.object({
  eventId: z.string().trim().min(1, 'Thiếu mã sự kiện').max(160),
});

const checkInBody = z.preprocess(
  (value) => (value && typeof value === 'object' ? value : {}),
  z.looseObject({
    photoUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .transform((value) => value || undefined),
  }),
);

module.exports = { monthQuery, eventIdParams, checkInBody };
