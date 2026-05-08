const mongoose = require('mongoose');

const lessonItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    titleVi: { type: String, required: true },
    title: { type: String, default: '' },
    conceptIds: { type: [String], default: [] },
    conceptAnchors: {
      type: [
        {
          conceptId: { type: String, required: true },
          phrase: { type: String, required: true },
        },
      ],
      default: [],
    },
    body: { type: String, default: '' },
    sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recallQuiz: {
      type: [
        {
          id: { type: String, default: '' },
          question: { type: String, required: true },
          options: [{ type: String }],
          correctIndex: { type: Number, default: 0 },
          optionExplanations: [{ type: String }],
        },
      ],
      default: [],
    },
    sceneContext: {
      type: new mongoose.Schema(
        {
          primaryEntityId: { type: String, default: '' },
          entityIds: [{ type: String }],
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { _id: false },
);

const depthSchema = new mongoose.Schema(
  {
    beginner: [lessonItemSchema],
    explorer: [lessonItemSchema],
    researcher: [lessonItemSchema],
  },
  { _id: false },
);

const nodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    titleVi: { type: String, required: true },
    title: { type: String, default: '' },
    depths: depthSchema,
    topicWeights: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const moduleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    order: { type: Number, required: true },
    titleVi: { type: String, required: true },
    title: { type: String, default: '' },
    emoji: { type: String, default: '' },
    goalVi: { type: String, default: '' },
    goal: { type: String, default: '' },
    connections: [{ type: String }],
    nodes: [nodeSchema],
  },
  { _id: false },
);

const conceptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: '' },
    labelVi: { type: String, default: '' },
    definition: { type: String, default: '' },
    definitionVi: { type: String, default: '' },
    aliases: [{ type: String }],
  },
  { _id: false },
);

const learningPathSchema = new mongoose.Schema(
  {
    slug: { type: String, default: 'main', unique: true },
    published: { type: Boolean, default: true },
    concepts: [conceptSchema],
    modules: [moduleSchema],
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.models.LearningPath || mongoose.model('LearningPath', learningPathSchema);
