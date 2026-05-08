const mongoose = require('mongoose');

const NarrativeSpaceSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    version: { type: String, default: '1.0.0' },
    title: {
      vi: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    templateId: { type: String, default: 'deep-time-journey' },
    world: {
      bodySlug: { type: String, default: 'earth' },
      atmospherePreset: { type: String, default: '' },
      colorGrade: { type: String, default: '' },
      effectTags: [{ type: String }],
      lightingPreset: { type: String, default: '' },
    },
    sequence: {
      type: {
        type: String,
        enum: ['geologic_ma', 'mission_sols', 'chapters', 'custom_epochs'],
        default: 'geologic_ma',
      },
      unit: { type: String, default: 'Ma' },
      range: [{ type: Number }],
      direction: { type: String, enum: ['forward', 'reverse'], default: 'reverse' },
    },
    beats: { type: [mongoose.Schema.Types.Mixed], default: [] },
    assetBundle: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.NarrativeSpace || mongoose.model('NarrativeSpace', NarrativeSpaceSchema);
