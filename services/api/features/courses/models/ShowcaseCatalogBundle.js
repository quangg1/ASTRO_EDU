const mongoose = require('mongoose');

/**
 * Bản ghi duy nhất (slug main): catalog sidebar, stories, quỹ đạo 3D showcase.
 * Seed từ client/src/data/showcaseCatalogBundle.json khi DB trống.
 */
const showcaseCatalogBundleSchema = new mongoose.Schema(
  {
    slug: { type: String, default: 'main', unique: true, index: true },
    stories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    catalog: { type: [mongoose.Schema.Types.Mixed], default: [] },
    orbits: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ShowcaseCatalogBundle', showcaseCatalogBundleSchema);
