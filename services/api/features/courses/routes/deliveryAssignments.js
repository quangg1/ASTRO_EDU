const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/deliverySchemas');
const assignment = require('../controllers/assignmentDeliveryController');

const router = express.Router({ mergeParams: true });
const assignmentRouter = express.Router({ mergeParams: true });

const withContext = validate({ params: schema.deliveryParams });

assignmentRouter.get('/draft', authMiddleware, withContext, assignment.draft);

assignmentRouter.post(
  '/staging-files',
  authMiddleware,
  validate({ params: schema.deliveryParams, body: schema.stagingFileBody }),
  assignment.attachStagingFile,
);

assignmentRouter.post('/validate-files', authMiddleware, withContext, assignment.validateFiles);

assignmentRouter.post(
  '/submit',
  authMiddleware,
  validate({ params: schema.deliveryParams, body: schema.submitAssignmentBody }),
  assignment.submit,
);

// Cùng một bộ endpoint phục vụ cả học lẻ lẫn học theo lớp.
router.use('/:slug/assignment/:lessonSlug', assignmentRouter);
router.use('/:slug/cohort/:cohortId/assignment/:lessonSlug', assignmentRouter);

module.exports = router;
