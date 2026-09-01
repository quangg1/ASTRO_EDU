const { asyncController, ok } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const { generateRecallQuizFromLesson } = require('../../../lib/ai/tasks/generateRecallQuiz');
const content = require('../services/learningPathContentService');
const progress = require('../services/learningProgressService');
const recallQuiz = require('../services/recallQuizService');
const events = require('../services/learningPathEventsService');
const {
  attributeGuestLearningSession,
} = require('../services/sessionAttributionService');

module.exports = asyncController({
  async detail(req, res) {
    return ok(res, { data: await content.getPublishedPath({ userRole: req.userRole }) });
  },

  async editorDetail(_req, res) {
    return ok(res, { data: await content.getPathForEditor() });
  },

  async save(req, res) {
    return ok(res, { data: await content.savePath(req.valid.body) });
  },

  async generateQuiz(req, res) {
    const result = await generateRecallQuizFromLesson(req.valid.body.lesson);
    if (!result.ok) {
      throw new AppError(
        result.status || 422,
        result.code || 'QUIZ_GENERATION_FAILED',
        result.error || 'Không thể sinh quiz',
        result.details || [],
      );
    }
    return ok(res, { data: { recallQuiz: result.recallQuiz } });
  },

  async recallQuiz(req, res) {
    return ok(res, { data: await recallQuiz.getRecallQuizDelivery(req.valid.params.lessonId) });
  },

  async submitRecallQuiz(req, res) {
    const data = await recallQuiz.submitRecallQuiz(
      req.userId,
      req.valid.params.lessonId,
      req.valid.body.answers,
    );
    return ok(res, { data });
  },

  async progress(req, res) {
    return ok(res, { data: await progress.getProgress(req.userId) });
  },

  async saveProgress(req, res) {
    return ok(res, { data: await progress.saveProgress(req.userId, req.valid.body) });
  },

  async solarJourneyProgress(req, res) {
    return ok(res, { data: await progress.getSolarJourneyProgress(req.userId) });
  },

  async saveSolarJourneyProgress(req, res) {
    const data = await progress.saveSolarJourneyProgress(
      req.userId,
      req.valid.body.completedMilestoneIds,
    );
    return ok(res, { data });
  },

  async attributeSession(req, res) {
    const data = await attributeGuestLearningSession(req.userId, req.valid.body.anonSessionId);
    return ok(res, { data });
  },

  async recordEventBatch(req, res) {
    const data = await events.recordEventBatch(req.userId || null, req.valid.body.events);
    return ok(res, { data });
  },
});
