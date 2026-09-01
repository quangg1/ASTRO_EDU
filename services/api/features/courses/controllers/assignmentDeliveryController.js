const { asyncController, ok } = require('../../../shared/http');
const assignment = require('../services/assignmentDeliveryService');

function context(req) {
  const { slug, lessonSlug, cohortId } = req.valid.params;
  return assignment.loadAssignmentContext({ slug, lessonSlug, cohortId, req });
}

module.exports = asyncController({
  async draft(req, res) {
    return ok(res, { data: await assignment.getDraft(await context(req)) });
  },

  async attachStagingFile(req, res) {
    const data = await assignment.attachStagingFile(await context(req), req.valid.body);
    return ok(res, { data });
  },

  async validateFiles(req, res) {
    return ok(res, { data: await assignment.validateDraftFiles(await context(req)) });
  },

  async submit(req, res) {
    const data = await assignment.submitAssignment(await context(req), {
      note: req.valid.body.note,
    });
    return ok(res, { data });
  },
});
