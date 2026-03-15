const mongoose = require('mongoose');

/**
 * PhylumMetadata: metadata cho từng ngành (phylum) hóa thạch.
 * Dùng cho hiển thị (nameVi, description, color) và sau này admin panel sửa.
 * locale hỗ trợ đa ngôn ngữ (mặc định 'vi').
 */

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

// unique: true trên phylum đã tạo index; chỉ thêm index cho locale
phylumMetadataSchema.index({ locale: 1 });

const PhylumMetadata = mongoose.model('PhylumMetadata', phylumMetadataSchema);

module.exports = PhylumMetadata;
