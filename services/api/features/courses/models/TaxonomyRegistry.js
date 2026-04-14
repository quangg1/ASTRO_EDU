const mongoose = require('mongoose');

const taxonomyRegistrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default', index: true },
    taxonomy: { type: Object, default: {} },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('TaxonomyRegistry', taxonomyRegistrySchema);
