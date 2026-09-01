const { asyncController, ok, created } = require('../../../shared/http');
const quiz = require('../services/quizDeliveryService');

/** Params đã được `deliverySchemas` chuẩn hóa, gồm cả `cohortId` = null cho học lẻ. */
function context(req) {
  const { slug, lessonSlug, cohortId } = req.valid.params;
  return quiz.loadQuizContext({ slug, lessonSlug, cohortId, req });
}

module.exports = asyncController({
  async session(req, res) {
    return ok(res, { data: await quiz.buildSession(await context(req)) });
  },

  async activeAttempt(req, res) {
    return ok(res, { data: await quiz.getActiveAttemptView(await context(req)) });
  },

  async startAttempt(req, res) {
    const { resumed, attempt } = await quiz.startAttempt(await context(req));
    return resumed ? ok(res, { data: attempt }) : created(res, { data: attempt });
  },

  async checkpoint(req, res) {
    const revision = await quiz.saveCheckpoint(await context(req), {
      attemptId: req.valid.params.attemptId,
      ...req.valid.body,
    });
    return ok(res, { revision });
  },

  async submit(req, res) {
    const data = await quiz.submitAttempt(await context(req), {
      attemptId: req.valid.params.attemptId,
      answers: req.valid.body.answers,
    });
    return ok(res, { data });
  },

  async confirmQuestion(req, res) {
    const data = await quiz.confirmQuestion(await context(req), {
      attemptId: req.valid.params.attemptId,
      ...req.valid.body,
    });
    return ok(res, { data });
  },
});
