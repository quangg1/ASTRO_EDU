/** ShopItem.category cho overlay bọc avatar (Discord-style decoration). */
const AVATAR_DECORATION_CATEGORY = 'avatar_decoration';

/** Slug ảo — đồng bộ client `features/rewards/constants/avatarDecoration.ts`. */
const DECORATION_CATEGORY_FALLBACK_ALL = '_all';
const DECORATION_CATEGORY_UNCATEGORIZED = '_other';
const DEFAULT_DECORATION_BULK_GEM = 0;

function isAvatarDecorationItem(doc) {
  return String(doc?.category || '').trim() === AVATAR_DECORATION_CATEGORY;
}

function getOverlayUrl(metadata) {
  const m = metadata && typeof metadata === 'object' ? metadata : {};
  const url = String(m.overlayUrl || m.assetUrl || '').trim();
  return url || null;
}

function getPreviewUrl(metadata) {
  const m = metadata && typeof metadata === 'object' ? metadata : {};
  return String(m.previewUrl || m.overlayUrl || m.assetUrl || '').trim() || null;
}

module.exports = {
  AVATAR_DECORATION_CATEGORY,
  DECORATION_CATEGORY_FALLBACK_ALL,
  DECORATION_CATEGORY_UNCATEGORIZED,
  DEFAULT_DECORATION_BULK_GEM,
  isAvatarDecorationItem,
  getOverlayUrl,
  getPreviewUrl,
};
