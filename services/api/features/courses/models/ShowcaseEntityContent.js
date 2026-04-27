const mongoose = require('mongoose');

/**
 * Nội dung biên tập cho entity catalog showcase (id khớp catalog / quỹ đạo).
 * Media: URL đầy đủ (HTTPS CDN / S3) hoặc /files/* từ POST /upload — client resolve qua getMediaBase.
 */
const showcaseEntityContentSchema = new mongoose.Schema(
  {
    entityId: { type: String, required: true, unique: true, index: true },
    nameVi: { type: String, default: '' },
    museumBlurbVi: { type: String, default: '' },
    /** @deprecated Dùng diffuseMapUrl; vẫn đọc/ghi để tương thích — merge client coi như diffuse nếu diffuse trống. */
    textureUrl: { type: String, default: '' },
    diffuseMapUrl: { type: String, default: '' },
    normalMapUrl: { type: String, default: '' },
    specularMapUrl: { type: String, default: '' },
    cloudMapUrl: { type: String, default: '' },
    /** glTF / glb trên CDN khi không dùng sphere + map tĩnh trong bundle. */
    modelUrl: { type: String, default: '' },
    published: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('ShowcaseEntityContent', showcaseEntityContentSchema);
