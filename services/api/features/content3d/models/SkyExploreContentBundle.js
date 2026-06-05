const mongoose = require('mongoose');

const skyExploreContentBundleSchema = new mongoose.Schema(
  {
    slug: { type: String, default: 'main', unique: true, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SkyExploreContentBundle', skyExploreContentBundleSchema);
