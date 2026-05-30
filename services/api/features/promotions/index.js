const express = require('express');
const { optionalAuth, authMiddleware } = require('../../shared/jwtAuth');
const { requireString } = require('../../shared/validation');
const { AppError } = require('../../shared/errors');
const { toClientMessage } = require('../../shared/publicError');
const {
  findActiveBannerForCourse,
  listActivePromotions,
  resolvePromoForCheckout,
  computePromoDiscount,
} = require('./services/promoCodeService');
const Course = require('../courses/models/Course');
const { courseRequiresPayment } = require('../courses/lib/coursePricing');

const router = express.Router();

/** Campaign đang chạy — banner toàn site, chuông thông báo (public). */
router.get('/active', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const data = await listActivePromotions({ limit });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không tải được ưu đãi.'),
    });
  }
});

/** Banner sự kiện / campaign cho trang khóa học (public). */
router.get('/course/:courseId/banner', optionalAuth, async (req, res) => {
  try {
    const courseId = requireString(req.params.courseId, 'courseId');
    const course = await Course.findOne({ _id: courseId, published: true }).lean();
    if (!course || !courseRequiresPayment(course)) {
      return res.json({ success: true, data: null });
    }
    const banner = await findActiveBannerForCourse(String(course._id));
    return res.json({ success: true, data: banner });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không tải được khuyến mãi.'),
    });
  }
});

/** Kiểm tra mã trước checkout (đã đăng nhập). */
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const code = requireString(req.body?.code, 'code');
    const courseId = requireString(req.body?.courseId, 'courseId');
    const resolved = await resolvePromoForCheckout({
      code,
      courseId,
      userId: req.userId,
    });
    const course = await Course.findOne({ _id: courseId, published: true }).lean();
    if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');
    const listPrice = Math.round(Number(course.price) || 0);
    const discount = computePromoDiscount(listPrice, resolved.promo);
    return res.json({
      success: true,
      data: {
        code: resolved.code,
        labelVi: resolved.labelVi,
        discountType: resolved.discountType,
        discountValue: resolved.discountValue,
        discountAmount: discount.discountAmount,
        finalAmount: discount.finalAmount,
        discountPct: discount.discountPct,
        currency: course.currency || 'VND',
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    return res.status(500).json({ success: false, error: toClientMessage(err, 'Không kiểm tra được mã.') });
  }
});

module.exports = router;
