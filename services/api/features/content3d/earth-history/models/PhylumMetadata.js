const mongoose = require('mongoose');

const phylumMetadataSchema = new mongoose.Schema(
  {
    phylum: { type: String, required: true, unique: true, trim: true },
    nameVi: { type: String, default: '' },
    description: { type: String, default: '' },
    color: { type: String, default: '#9ca3af' },
    locale: { type: String, default: 'vi', trim: true },
  },
  { timestamps: true, collection: 'phylum_metadata' }
);

phylumMetadataSchema.index({ locale: 1 });

module.exports = mongoose.models.PhylumMetadata || mongoose.model('PhylumMetadata', phylumMetadataSchema);
