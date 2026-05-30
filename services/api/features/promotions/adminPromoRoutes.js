const express = require('express');
const { authMiddleware } = require('../../shared/jwtAuth');
const { requireAdminScope } = require('../../shared/adminScopes');
const { requireString } = require('../../shared/validation');
const { AppError } = require('../../shared/errors');
const PromoCode = require('./models/PromoCode');
const { normalizeCode, promoToAdminDto } = require('./services/promoCodeService');

const router = express.Router();

router.use(authMiddleware, requireAdminScope('promo'));

router.get('/', async (_req, res) => {
  try {
    const rows = await PromoCode.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, data: rows.map(promoToAdminDto) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/', async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) throw new AppError(400, 'INVALID_CODE', 'Thiếu mã coupon');
    const discountType = req.body?.discountType === 'fixed' ? 'fixed' : 'percent';
    const discountValue = Math.round(Number(req.body?.discountValue) || 0);
    if (discountValue <= 0) throw new AppError(400, 'INVALID_VALUE', 'Giá trị giảm phải > 0');
    if (discountType === 'percent' && discountValue > 100) {
      throw new AppError(400, 'INVALID_VALUE', 'Giảm % tối đa 100');
    }

    const doc = await PromoCode.create({
      code,
      labelVi: String(req.body?.labelVi || code).trim(),
      descriptionVi: String(req.body?.descriptionVi || '').trim(),
      discountType,
      discountValue,
      courseIds: Array.isArray(req.body?.courseIds)
        ? req.body.courseIds.map(String).filter(Boolean)
        : [],
      startsAt: req.body?.startsAt ? new Date(req.body.startsAt) : null,
      endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : null,
      maxRedemptions: req.body?.maxRedemptions != null ? Math.max(1, Number(req.body.maxRedemptions)) : null,
      maxPerUser: Math.max(1, Math.round(Number(req.body?.maxPerUser) || 1)),
      active: req.body?.active !== false,
      eventKey: String(req.body?.eventKey || '').trim() || null,
      bannerTitleVi: String(req.body?.bannerTitleVi || '').trim(),
      bannerBodyVi: String(req.body?.bannerBodyVi || '').trim(),
      bannerAccentColor: String(req.body?.bannerAccentColor || '#06b6d4').trim(),
    });
    res.status(201).json({ success: true, data: promoToAdminDto(doc) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, error: 'Mã coupon đã tồn tại' });
    }
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const doc = await PromoCode.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy' });

    if (req.body?.labelVi != null) doc.labelVi = String(req.body.labelVi).trim();
    if (req.body?.descriptionVi != null) doc.descriptionVi = String(req.body.descriptionVi).trim();
    if (req.body?.discountType != null) {
      doc.discountType = req.body.discountType === 'fixed' ? 'fixed' : 'percent';
    }
    if (req.body?.discountValue != null) {
      doc.discountValue = Math.round(Number(req.body.discountValue) || 0);
    }
    if (req.body?.courseIds != null) {
      doc.courseIds = Array.isArray(req.body.courseIds) ? req.body.courseIds.map(String).filter(Boolean) : [];
    }
    if (req.body?.startsAt !== undefined) doc.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null;
    if (req.body?.endsAt !== undefined) doc.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
    if (req.body?.maxRedemptions !== undefined) {
      doc.maxRedemptions = req.body.maxRedemptions == null ? null : Math.max(1, Number(req.body.maxRedemptions));
    }
    if (req.body?.maxPerUser != null) doc.maxPerUser = Math.max(1, Math.round(Number(req.body.maxPerUser) || 1));
    if (req.body?.active != null) doc.active = Boolean(req.body.active);
    if (req.body?.eventKey !== undefined) doc.eventKey = String(req.body.eventKey || '').trim() || null;
    if (req.body?.bannerTitleVi != null) doc.bannerTitleVi = String(req.body.bannerTitleVi).trim();
    if (req.body?.bannerBodyVi != null) doc.bannerBodyVi = String(req.body.bannerBodyVi).trim();
    if (req.body?.bannerAccentColor != null) doc.bannerAccentColor = String(req.body.bannerAccentColor).trim();

    await doc.save();
    res.json({ success: true, data: promoToAdminDto(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await PromoCode.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
