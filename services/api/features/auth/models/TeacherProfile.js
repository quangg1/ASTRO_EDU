const mongoose = require('mongoose');

/** Hồ sơ công khai giáo viên — hiển thị trên khóa học để học viên xác minh. */
const teacherProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    fullName: { type: String, trim: true, default: '', maxlength: 200 },
    headline: { type: String, trim: true, default: '', maxlength: 300 },
    bio: { type: String, trim: true, default: '', maxlength: 8000 },
    organization: { type: String, trim: true, default: '', maxlength: 500 },
    expertise: { type: [String], default: [] },
    education: { type: String, trim: true, default: '', maxlength: 2000 },
    yearsExperience: { type: Number, min: 0, max: 80, default: null },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    website: { type: String, trim: true, default: '', maxlength: 500 },
    linkedin: { type: String, trim: true, default: '', maxlength: 500 },
    avatarUrl: { type: String, default: null },
    published: { type: Boolean, default: true, index: true },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);
