const { AppError } = require('../../../shared/errors');
const { promoCodeRepository } = require('../repositories/promoRepository');
const { normalizeCode, promoToAdminDto } = require('./promoCodeService');

const DEFAULT_ACCENT_COLOR = '#06b6d4';

const trimmed = (value, fallback = '') => String(value ?? fallback).trim();
const toCourseIds = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);
const toDate = (value) => (value ? new Date(value) : null);
const atLeastOne = (value) => Math.max(1, Math.round(Number(value) || 1));

function assertDiscount(discountType, discountValue) {
  if (discountValue <= 0) throw new AppError(400, 'INVALID_VALUE', 'Giá trị giảm phải > 0');
  if (discountType === 'percent' && discountValue > 100) {
    throw new AppError(400, 'INVALID_VALUE', 'Giảm % tối đa 100');
  }
}

async function listPromos() {
  const rows = await promoCodeRepository.listForAdmin();
  return rows.map(promoToAdminDto);
}

async function createPromo(body) {
  const code = normalizeCode(body.code);
  if (!code) throw new AppError(400, 'INVALID_CODE', 'Thiếu mã coupon');

  const discountType = body.discountType === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Math.round(Number(body.discountValue) || 0);
  assertDiscount(discountType, discountValue);

  try {
    const doc = await promoCodeRepository.create({
      code,
      labelVi: trimmed(body.labelVi, code),
      descriptionVi: trimmed(body.descriptionVi),
      discountType,
      discountValue,
      courseIds: toCourseIds(body.courseIds),
      startsAt: toDate(body.startsAt),
      endsAt: toDate(body.endsAt),
      maxRedemptions: body.maxRedemptions != null ? Math.max(1, Number(body.maxRedemptions)) : null,
      maxPerUser: atLeastOne(body.maxPerUser),
      active: body.active !== false,
      eventKey: trimmed(body.eventKey) || null,
      bannerTitleVi: trimmed(body.bannerTitleVi),
      bannerBodyVi: trimmed(body.bannerBodyVi),
      bannerAccentColor: trimmed(body.bannerAccentColor, DEFAULT_ACCENT_COLOR),
    });
    return promoToAdminDto(doc);
  } catch (err) {
    if (err?.code === 11000) throw AppError.conflict('Mã coupon đã tồn tại');
    throw err;
  }
}

/** PATCH: chỉ đụng tới trường được gửi lên, mã coupon thì không cho đổi. */
function applyPatch(doc, body) {
  if (body.labelVi != null) doc.labelVi = trimmed(body.labelVi);
  if (body.descriptionVi != null) doc.descriptionVi = trimmed(body.descriptionVi);
  if (body.discountType != null) {
    doc.discountType = body.discountType === 'fixed' ? 'fixed' : 'percent';
  }
  if (body.discountValue != null) doc.discountValue = Math.round(Number(body.discountValue) || 0);
  if (body.courseIds != null) doc.courseIds = toCourseIds(body.courseIds);
  if (body.startsAt !== undefined) doc.startsAt = toDate(body.startsAt);
  if (body.endsAt !== undefined) doc.endsAt = toDate(body.endsAt);
  if (body.maxRedemptions !== undefined) {
    doc.maxRedemptions =
      body.maxRedemptions == null ? null : Math.max(1, Number(body.maxRedemptions));
  }
  if (body.maxPerUser != null) doc.maxPerUser = atLeastOne(body.maxPerUser);
  if (body.active != null) doc.active = Boolean(body.active);
  if (body.eventKey !== undefined) doc.eventKey = trimmed(body.eventKey) || null;
  if (body.bannerTitleVi != null) doc.bannerTitleVi = trimmed(body.bannerTitleVi);
  if (body.bannerBodyVi != null) doc.bannerBodyVi = trimmed(body.bannerBodyVi);
  if (body.bannerAccentColor != null) doc.bannerAccentColor = trimmed(body.bannerAccentColor);
}

async function updatePromo(promoId, body) {
  const doc = await promoCodeRepository.findDocById(promoId);
  if (!doc) throw AppError.notFound('Không tìm thấy');

  applyPatch(doc, body);
  assertDiscount(doc.discountType, doc.discountValue);
  await doc.save();

  return promoToAdminDto(doc);
}

async function deletePromo(promoId) {
  const doc = await promoCodeRepository.deleteById(promoId);
  if (!doc) throw AppError.notFound('Không tìm thấy');
}

module.exports = { listPromos, createPromo, updatePromo, deletePromo };
