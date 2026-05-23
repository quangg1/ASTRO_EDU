const path = require('path');

function slugifyCategory(input) {
  const s = String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return s || `cat-${Date.now()}`;
}

function basenameFromOriginal(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const base = path
    .basename(originalName || 'overlay', ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return base || 'overlay';
}

function skuForDecoration(categorySlug, base) {
  const cat = String(categorySlug || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const b = String(base || 'overlay')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  return `deco_${cat}_${b}`;
}

/** CDN key — tách theo category, không trùng folder item khác */
function overlayStorageKey(categorySlug, base, ext) {
  const cat = slugifyCategory(categorySlug).replace(/-/g, '-');
  const safeCat = cat.replace(/[^a-z0-9-]/g, '-');
  const safeBase = String(base || 'overlay').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExt = ext && ext.startsWith('.') ? ext : `.${ext || 'png'}`;
  return `decorations/categories/${safeCat}/overlays/${safeBase}${safeExt}`;
}

module.exports = {
  slugifyCategory,
  basenameFromOriginal,
  skuForDecoration,
  overlayStorageKey,
};
