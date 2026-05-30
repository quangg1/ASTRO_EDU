const mongoose = require('mongoose');

/**
 * Nhóm trang trí avatar (kiểu Discord Shop: Lunar New Year, Steampunk…).
 * Asset overlay lưu CDN: decorations/categories/{slug}/overlays/*
 */
const decorationCategorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    nameVi: { type: String, default: '' },
    subtitleVi: { type: String, default: '' },
    /** Ảnh banner ngang (CDN) — tuỳ chọn */
    bannerUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0, index: true },
    visible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('DecorationCategory', decorationCategorySchema);
