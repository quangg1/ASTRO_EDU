const mongoose = require('mongoose');

const conceptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    short_description: { type: String, default: '' },
    explanation: { type: String, default: '' },
    examples: [{ type: String }],
    related: [{ type: String }],
    domain: { type: String, default: '' },
    subdomain: { type: String, default: '' },
    aliases: [{ type: String }],
    prerequisites: [{ type: String }],
    published: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('Concept', conceptSchema);
