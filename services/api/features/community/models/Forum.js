const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },
  isNews: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Forum', forumSchema);
