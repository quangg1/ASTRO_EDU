const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    titleVi: { type: String, required: true },
    descriptionVi: { type: String, default: '' },
    category: { type: String, default: 'learning_path' },
    /** e.g. depth_researcher_count, total_gems, streak_days */
    criteriaType: { type: String, default: '' },
    criteriaThreshold: { type: Number, default: 0 },
    gemBonus: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('Achievement', achievementSchema);
