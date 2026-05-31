const mongoose = require('mongoose');
const { quizQuestionMongooseSchema } = require('../../../shared/quizQuestion');

const exploreContextualQuestionPoolSchema = new mongoose.Schema(
  {
    entityId: { type: String, required: true, unique: true, index: true },
    questions: { type: [quizQuestionMongooseSchema], default: [] },
    /** template_seed | ai | mixed */
    source: { type: String, default: 'template_seed' },
    templateSeededAt: { type: Date, default: null },
    aiGeneratedAt: { type: Date, default: null },
    lastAiAttemptAt: { type: Date, default: null },
    aiGenerationCount: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);

module.exports =
  mongoose.models.ExploreContextualQuestionPool ||
  mongoose.model('ExploreContextualQuestionPool', exploreContextualQuestionPoolSchema);
