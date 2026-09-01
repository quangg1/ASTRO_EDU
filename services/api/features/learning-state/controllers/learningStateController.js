const { asyncController, ok } = require('../../../shared/http');
const engine = require('../services/learningStateEngine');
const conceptStates = require('../services/conceptStateQueryService');

module.exports = asyncController({
  async snapshot(req, res) {
    return ok(res, { snapshot: await engine.getLearnerSnapshot(req.userId) });
  },

  async lessonState(req, res) {
    return ok(res, { state: await engine.getLessonState(req.userId, req.valid.params.lessonId) });
  },

  async conceptState(req, res) {
    return ok(res, {
      state: await engine.getConceptState(req.userId, req.valid.params.conceptId),
    });
  },

  async conceptStates(req, res) {
    const concepts = await conceptStates.getConceptChips(req.userId, req.valid.query.ids);
    return ok(res, { concepts });
  },

  async weakLessons(req, res) {
    const weakLessons = await engine.getWeakLessons(req.userId, {
      lessonId: req.valid.query.lessonId,
    });
    return ok(res, { weakLessons });
  },

  async spacedReview(req, res) {
    return ok(res, await engine.getSpacedReviewDue(req.userId, { limit: req.valid.query.limit }));
  },

  async recordEvents(req, res) {
    const results = [];
    // Tuần tự chứ không song song: các sự kiện của cùng một người học cùng cập
    // nhật một bản ghi trạng thái.
    for (const event of req.valid.body) {
      results.push(await engine.recordLearningEvent(req.userId, event));
    }
    return ok(res, { results });
  },
});
