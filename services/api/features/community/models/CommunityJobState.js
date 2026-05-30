const mongoose = require('mongoose');

const communityJobStateSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    lastRunAt: { type: Date, default: null },
    lastResult: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('CommunityJobState', communityJobStateSchema);
