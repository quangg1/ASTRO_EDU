const mongoose = require('mongoose');

const learningPathEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true, sparse: true, index: true },
    schemaVersion: { type: Number, default: 1 },
    userId: { type: String, default: null, index: true },
    anonSessionId: { type: String, default: null, index: true },
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
        'scene_entity_focus_duration',
        'scene_entity_clicked',
        'scene_concept_overlay_shown',
        'scene_contextual_quiz_prompted',
        'scene_contextual_quiz_passed',
        'scene_entity_discovered',
        'deep_history_beat_dwell',
        'deep_history_site_opened',
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
learningPathEventSchema.index({ anonSessionId: 1, userId: 1, timestamp: -1 });

module.exports = mongoose.models.LearningPathEvent || mongoose.model('LearningPathEvent', learningPathEventSchema);
