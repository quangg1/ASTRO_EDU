const GemRuntimeConfig = require('../models/GemRuntimeConfig');
const ShopItem = require('../models/ShopItem');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
const { RUNTIME_CONFIG_BOUNDS } = require('../constants/gemEarn');

const CONFIG_KEY = 'global';

/** In-process cache seasonal multiplier để không hit DB mỗi LP event (~60s) */
let multiplierCache = { expiresAtMs: 0, value: 1 };

function effectiveSeasonalMultiplier(doc) {
  if (!doc || doc.seasonalMultiplier == null) return 1;
  const raw = Number(doc.seasonalMultiplier);
  const { min, max } = RUNTIME_CONFIG_BOUNDS.seasonalMultiplier;
  let m = Math.min(max, Math.max(min, raw));
  if (m <= 1) return 1;
  const end = doc.seasonalEndsAt ? new Date(doc.seasonalEndsAt).getTime() : 0;
  if (!end || Number.isNaN(end) || end <= Date.now()) return 1;
  return m;
}

/**
 * Effective multiplier hiện tại — dùng sau khi warmup cache.
 */
async function getCachedSeasonalMultiplier(ttlMs = 60_000) {
  if (Date.now() < multiplierCache.expiresAtMs) return multiplierCache.value;
  const doc = await GemRuntimeConfig.findOne({ key: CONFIG_KEY }).lean();
  const v = effectiveSeasonalMultiplier(doc);
  multiplierCache = { expiresAtMs: Date.now() + ttlMs, value: v };
  return v;
}

function invalidateMultiplierCache() {
  multiplierCache = { expiresAtMs: 0, value: 1 };
}

/**
 * Áp multiplier cho một khoản earn đã rounding về integer ≥ 1 khi amount ≥ 1.
 */
function scaleEarn(amount, multiplier) {
  const n = Number(amount) || 0;
  if (n <= 0) return 0;
  const m = Number(multiplier) || 1;
  return Math.max(1, Math.round(n * m));
}

async function getOrCreateConfigDoc() {
  let doc = await GemRuntimeConfig.findOne({ key: CONFIG_KEY }).lean();
  if (!doc) {
    doc = (
      await GemRuntimeConfig.findOneAndUpdate(
        { key: CONFIG_KEY },
        { key: CONFIG_KEY },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()
    );
  }
  return doc;
}

function validateWeeklyCap(v) {
  const num = Number(v);
  const { min, max } = RUNTIME_CONFIG_BOUNDS.weeklyDeepHistoryCap;
  if (Number.isNaN(num)) throw new Error('weeklyDeepHistoryCap không hợp lệ');
  if (num < min || num > max) {
    throw new Error(`weeklyDeepHistoryCap phải trong [${min}, ${max}]`);
  }
}

function validateSeasonal(multiplier, endsAtRaw) {
  const m = Number(multiplier);
  const { min, max } = RUNTIME_CONFIG_BOUNDS.seasonalMultiplier;
  if (Number.isNaN(m)) throw new Error('seasonalMultiplier không hợp lệ');
  if (m < min || m > max) throw new Error(`seasonalMultiplier phải trong [${min}, ${max}]`);

  if (m > 1) {
    if (!endsAtRaw) throw new Error('seasonalMultiplier > 1 bắt buộc có seasonalEndsAt');
    const t = new Date(endsAtRaw).getTime();
    if (!t || Number.isNaN(t) || t <= Date.now()) {
      throw new Error('seasonalEndsAt phải là thời điểm tương lai');
    }
  }
}

function validateOverrides(overrides) {
  const { minFactor, maxFactor } = RUNTIME_CONFIG_BOUNDS.priceOverrideBand;
  if (!Array.isArray(overrides)) throw new Error('itemPriceOverrides phải là mảng');
  return Promise.all(
    overrides.map(async (row) => {
      const sku = String(row?.itemId || '').trim();
      const price = Number(row?.price);
      if (!sku) throw new Error('itemPriceOverrides[].itemId bắt buộc');
      if (!Number.isFinite(price) || price < 0) throw new Error(`Giá không hợp lệ: ${sku}`);

      const item = await ShopItem.findOne({ skuId: sku }).lean();
      if (!item) throw new Error(`Không có ShopItem skuId=${sku}`);

      const base = Number(item.basePriceGem) || 0;
      const lo = Math.ceil(base * minFactor);
      const hi = Math.floor(base * maxFactor);
      if (base <= 0) {
        if (price !== 0) throw new Error(`SKU ${sku} base 0 chỉ được override giá 0`);
        return { itemId: sku, price: 0 };
      }
      if (price < lo || price > hi) {
        throw new Error(`Giá SKU ${sku} phải trong [${lo}, ${hi}] (±30% base ${base})`);
      }
      return { itemId: sku, price };
    }),
  );
}

function validateVoucherCap(pct) {
  const v = Number(pct);
  const { min, max } = RUNTIME_CONFIG_BOUNDS.voucherMaxDiscountPct;
  if (Number.isNaN(v) || v < min || v > max) {
    throw new Error(`voucherMaxDiscountPct phải trong [${min}, ${max}]`);
  }
}

/**
 * PATCH body: { seasonalMultiplier?, seasonalEndsAt|null, weeklyDeepHistoryCap?,
 *              itemPriceOverrides?, voucherMaxDiscountPct? }
 */
async function patchRuntimeConfig(body, actorUserId) {
  const next = { ...(typeof body === 'object' ? body : {}) };

  const docBefore = await getOrCreateConfigDoc();

  const update = {};

  if (next.seasonalMultiplier != null || next.seasonalEndsAt !== undefined) {
    const mult =
      next.seasonalMultiplier != null ? Number(next.seasonalMultiplier) : Number(docBefore.seasonalMultiplier) || 1;
    const ends =
      next.seasonalEndsAt !== undefined ? next.seasonalEndsAt : docBefore.seasonalEndsAt || null;

    validateSeasonal(mult, mult > 1 ? ends : null);
    update.seasonalMultiplier = mult;
    update.seasonalEndsAt =
      mult > 1 && ends ? new Date(ends) : null;
  }

  if (next.weeklyDeepHistoryCap != null) {
    validateWeeklyCap(next.weeklyDeepHistoryCap);
    update.weeklyDeepHistoryCap = Number(next.weeklyDeepHistoryCap);
  }

  if (next.voucherMaxDiscountPct != null) {
    validateVoucherCap(next.voucherMaxDiscountPct);
    update.voucherMaxDiscountPct = Number(next.voucherMaxDiscountPct);
  }

  if (next.itemPriceOverrides != null) {
    update.itemPriceOverrides = await validateOverrides(next.itemPriceOverrides);
  }

  if (Object.keys(update).length === 0) {
    return GemRuntimeConfig.findOne({ key: CONFIG_KEY }).lean();
  }

  update.lastEditedByUserId = String(actorUserId || '');
  update.lastEditedReason = String(next.editNote || '').slice(0, 500);

  const saved = await GemRuntimeConfig.findOneAndUpdate({ key: CONFIG_KEY }, { $set: update }, { new: true }).lean();
  invalidateMultiplierCache();

  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId || ''),
    action: 'runtime_config_patch',
    reason: String(next.editNote || 'GemRuntimeConfig PATCH').slice(0, 2000),
    payload: { patch: update },
  });

  return saved;
}

async function getPublicRuntimeSummary() {
  const doc = await getOrCreateConfigDoc();
  return {
    seasonalMultiplierConfigured: Number(doc?.seasonalMultiplier) || 1,
    seasonalMultiplierEffective: effectiveSeasonalMultiplier(doc),
    seasonalEndsAt: doc?.seasonalEndsAt || null,
    weeklyDeepHistoryCap: doc?.weeklyDeepHistoryCap ?? 50,
    voucherMaxDiscountPct: doc?.voucherMaxDiscountPct ?? RUNTIME_CONFIG_BOUNDS.voucherMaxDiscountPct.max,
  };
}

function effectiveGemPrice(basePriceGem, skuId, itemPriceOverrides) {
  const list = Array.isArray(itemPriceOverrides) ? itemPriceOverrides : [];
  const hit = list.find((x) => x.itemId === String(skuId));
  const o = Number(hit?.price);
  if (!Number.isFinite(o)) return Number(basePriceGem) || 0;
  return o;
}

module.exports = {
  CONFIG_KEY,
  getOrCreateConfigDoc,
  patchRuntimeConfig,
  getCachedSeasonalMultiplier,
  scaleEarn,
  effectiveSeasonalMultiplier,
  invalidateMultiplierCache,
  getPublicRuntimeSummary,
  effectiveGemPrice,
};
