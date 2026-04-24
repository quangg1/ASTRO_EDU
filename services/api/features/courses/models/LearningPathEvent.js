const mongoose = require('mongoose');

const learningPathEventSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null, index: true },
    sessionId: { type: String, required: true, index: true },
    eventName: {
      type: String,
      required: true,
      enum: [
        'lp_module_viewed',
        'lp_node_viewed',
        'lp_lesson_opened',
        'lp_lesson_completed_toggled',
        'lp_lesson_dwell',
        'lp_lesson_mastered',
        'lp_concept_opened',
        'lp_concept_anchor_clicked',
        'lp_depth_switched',
        'lp_path_exited',
      ],
      index: true,
    },
    timestamp: { type: Date, required: true, index: true },
    moduleId: { type: String, default: null, index: true },
    nodeId: { type: String, default: null, index: true },
    lessonId: { type: String, default: null, index: true },
    depth: { type: String, enum: ['beginner', 'explorer', 'researcher', null], default: null },
    durationSec: { type: Number, default: null },
    activeSec: { type: Number, default: null },
    idleSec: { type: Number, default: null },
    completed: { type: Boolean, default: null },
    client: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    appVersion: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

learningPathEventSchema.index({ sessionId: 1, timestamp: 1 });
learningPathEventSchema.index({ eventName: 1, timestamp: -1 });
learningPathEventSchema.index({ moduleId: 1, nodeId: 1, lessonId: 1, timestamp: -1 });

module.exports = mongoose.model('LearningPathEvent', learningPathEventSchema);
