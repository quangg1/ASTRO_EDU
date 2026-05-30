const path = require('path');
const ShopItem = require('../models/ShopItem');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
const { persistUploadedFile } = require('../../media/uploadStorage');
const { AVATAR_DECORATION_CATEGORY, DEFAULT_DECORATION_BULK_GEM } = require('../constants/avatarDecoration');
const { basenameFromOriginal, skuForDecoration, overlayStorageKey } = require('../lib/decorationSlugs');
const { getCategoryBySlug } = require('./decorationCategoryService');

async function uniqueSku(categorySlug, base, attempt = 0) {
  const suffix = attempt > 0 ? `_${attempt}` : '';
  const sku = `${skuForDecoration(categorySlug, base)}${suffix}`;
  const exists = await ShopItem.findOne({ skuId: sku }).lean();
  if (exists) return uniqueSku(categorySlug, base, attempt + 1);
  return sku;
}

/**
 * Upload nhiều overlay + tạo ShopItem (0 gem mặc định) trong một category.
 * @param {string} categorySlug
 * @param {Express.Multer.File[]} files
 * @param {string} actorUserId
 */
async function bulkImportOverlays(categorySlug, files, actorUserId) {
  const cat = await getCategoryBySlug(categorySlug);
  if (!Array.isArray(files) || files.length === 0) {
    const e = new Error('Chưa có file nào được tải lên');
    e.status = 400;
    throw e;
  }

  const results = [];
  let sortBase =
    (await ShopItem.countDocuments({
      category: AVATAR_DECORATION_CATEGORY,
      'metadata.decorationCategorySlug': cat.slug,
    })) || 0;

  for (const file of files) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    if (!/^\.(png|webp|gif)$/i.test(ext)) {
      results.push({
        ok: false,
        file: file.originalname,
        error: 'Định dạng không hỗ trợ (chỉ png, webp, gif)',
      });
      continue;
    }
    const base = basenameFromOriginal(file.originalname);
    try {
      const skuId = await uniqueSku(cat.slug, base);
      const storageKey = overlayStorageKey(cat.slug, base, ext);
      const { url, storageKey: storedKey, cdn } = await persistUploadedFile(file, storageKey);
      const nameVi = base.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const row = await ShopItem.create({
        skuId,
        nameVi,
        descriptionVi: '',
        category: AVATAR_DECORATION_CATEGORY,
        basePriceGem: DEFAULT_DECORATION_BULK_GEM,
        visible: true,
        metadata: {
          overlayUrl: url,
          previewUrl: url,
          decorationCategorySlug: cat.slug,
          sortOrder: sortBase,
          storageKey: storedKey,
          cdn: Boolean(cdn),
          sourceFilename: file.originalname,
        },
      });
      sortBase += 1;
      results.push({
        ok: true,
        skuId: row.skuId,
        nameVi: row.nameVi,
        overlayUrl: url,
        storageKey: storedKey,
      });
    } catch (err) {
      results.push({
        ok: false,
        file: file.originalname,
        error: err.message || 'Lỗi import',
      });
    }
  }

  const created = results.filter((r) => r.ok).length;
  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'decoration_bulk_import',
    reason: `Bulk import ${created}/${files.length} vào ${cat.slug}`,
    payload: { categorySlug: cat.slug, created, total: files.length },
  });

  return {
    categorySlug: cat.slug,
    created,
    failed: results.length - created,
    items: results,
  };
}

module.exports = {
  bulkImportOverlays,
};
