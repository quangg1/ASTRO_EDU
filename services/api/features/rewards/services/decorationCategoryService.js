const DecorationCategory = require('../models/DecorationCategory');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
const { slugifyCategory } = require('../lib/decorationSlugs');

async function listCategoriesAdmin() {
  return DecorationCategory.find({}).sort({ sortOrder: 1, slug: 1 }).lean();
}

async function listCategoriesPublic() {
  return DecorationCategory.find({ visible: true }).sort({ sortOrder: 1, slug: 1 }).lean();
}

async function getCategoryBySlug(slug) {
  const s = String(slug || '').trim();
  const row = await DecorationCategory.findOne({ slug: s }).lean();
  if (!row) {
    const e = new Error('Không tìm thấy nhóm trang trí');
    e.status = 404;
    throw e;
  }
  return row;
}

async function createCategory(payload, actorUserId) {
  const slug = slugifyCategory(payload?.slug || payload?.nameVi || '');
  const dup = await DecorationCategory.findOne({ slug }).lean();
  if (dup) {
    const e = new Error(`Nhóm đã tồn tại: ${slug}`);
    e.status = 409;
    throw e;
  }
  let sortOrder = Number(payload?.sortOrder);
  if (!Number.isFinite(sortOrder)) {
    const last = await DecorationCategory.findOne({}).sort({ sortOrder: -1 }).select('sortOrder').lean();
    sortOrder = (Number(last?.sortOrder) || 0) + 10;
  }
  const row = await DecorationCategory.create({
    slug,
    nameVi: String(payload?.nameVi || slug).trim(),
    subtitleVi: String(payload?.subtitleVi || '').trim(),
    bannerUrl: String(payload?.bannerUrl || '').trim(),
    sortOrder,
    visible: payload?.visible !== false,
  });
  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'decoration_category_create',
    reason: String(payload?.editNote || 'create DecorationCategory').slice(0, 2000),
    payload: { slug },
  });
  return row.toObject();
}

async function updateCategory(slug, payload, actorUserId) {
  const row = await DecorationCategory.findOne({ slug: String(slug).trim() });
  if (!row) {
    const e = new Error('Không tìm thấy nhóm trang trí');
    e.status = 404;
    throw e;
  }
  if (payload.nameVi !== undefined) row.nameVi = String(payload.nameVi);
  if (payload.subtitleVi !== undefined) row.subtitleVi = String(payload.subtitleVi);
  if (payload.bannerUrl !== undefined) row.bannerUrl = String(payload.bannerUrl || '').trim();
  if (payload.sortOrder !== undefined) row.sortOrder = Number(payload.sortOrder) || 0;
  if (payload.visible !== undefined) row.visible = Boolean(payload.visible);
  await row.save();
  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'decoration_category_update',
    reason: String(payload?.editNote || 'update DecorationCategory').slice(0, 2000),
    payload: { slug: row.slug },
  });
  return row.toObject();
}

module.exports = {
  listCategoriesAdmin,
  listCategoriesPublic,
  getCategoryBySlug,
  createCategory,
  updateCategory,
};
