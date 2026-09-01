const { asyncController, ok } = require('../../../shared/http');
const gradebook = require('../services/cohortGradebookService');

module.exports = asyncController({
  async listSubmissions(req, res) {
    const data = await gradebook.listSubmissions({
      course: req.course,
      cohort: req.cohort,
      status: req.valid.query.status,
    });
    return ok(res, { data });
  },

  async gradeSubmission(req, res) {
    const data = await gradebook.gradeSubmission({
      course: req.course,
      submissionId: req.params.submissionId,
      graderId: req.userId,
      input: req.valid.body,
    });
    return ok(res, { data });
  },

  async quizAttempts(req, res) {
    const data = await gradebook.summarizeQuizAttempts({ course: req.course, cohort: req.cohort });
    return ok(res, { data });
  },
});
