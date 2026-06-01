const mongoose = require('mongoose');

const educationEntrySchema = new mongoose.Schema(
  {
    school: { type: String, trim: true, default: '', maxlength: 200 },
    degree: { type: String, trim: true, default: '', maxlength: 120 },
    field: { type: String, trim: true, default: '', maxlength: 200 },
    yearEnd: { type: Number, min: 1950, max: 2100, default: null },
  },
  { _id: false },
);

/** Hồ sơ học tập công khai — hiển thị tại /users/:id */
const learnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bio: { type: String, trim: true, default: '', maxlength: 2000 },
    location: { type: String, trim: true, default: '', maxlength: 120 },
    education: { type: [educationEntrySchema], default: [] },
    interests: { type: [String], default: [] },
    /** Cho phép người khác xem hồ sơ mở rộng (bio, học vấn, sở thích). */
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

learnerProfileSchema.path('education').validate(function (v) {
  return !v || v.length <= 6;
}, 'Tối đa 6 mục học vấn');

learnerProfileSchema.path('interests').validate(function (v) {
  return !v || v.length <= 16;
}, 'Tối đa 16 sở thích');

module.exports = mongoose.model('LearnerProfile', learnerProfileSchema);
