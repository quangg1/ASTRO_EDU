const mongoose = require('mongoose');

const astronomyEventTypeKitSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['moon_phase', 'meteor_shower', 'lunar_eclipse', 'solar_eclipse', 'planet_highlight'],
      required: true,
      unique: true,
      index: true,
    },
    typeLabelVi: { type: String, default: '' },
    legendLabelVi: { type: String, default: '' },
    legendGroup: {
      type: String,
      enum: ['moon', 'meteor', 'eclipse', 'planet', 'conjunction'],
      default: 'moon',
    },
    accentColor: { type: String, default: null },
    iconKey: {
      type: String,
      enum: ['moon', 'sparkles', 'eclipse', 'sun', 'telescope', 'star', 'orbit', 'flame'],
      default: 'moon',
    },
    defaultVisibilityLabelVi: { type: String, default: '' },
    defaultObservationTipsVi: { type: String, default: '' },
    descriptionHintVi: { type: String, default: '' },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('AstronomyEventTypeKit', astronomyEventTypeKitSchema);
