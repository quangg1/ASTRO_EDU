const mongoose = require('mongoose');

const showcaseEntityContentSchema = new mongoose.Schema(
  {
    entityId: { type: String, required: true, unique: true, index: true },
    nameVi: { type: String, default: '' },
    museumBlurbVi: { type: String, default: '' },
    textureUrl: { type: String, default: '' },
    diffuseMapUrl: { type: String, default: '' },
    normalMapUrl: { type: String, default: '' },
    specularMapUrl: { type: String, default: '' },
    cloudMapUrl: { type: String, default: '' },
    modelUrl: { type: String, default: '' },
    published: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('ShowcaseEntityContent', showcaseEntityContentSchema);
