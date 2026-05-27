const express = require('express');
const coursesBaseRouter = require('./routes/courses');
const deliveryQuizRouter = require('./routes/deliveryQuiz');
const deliveryAssignmentsRouter = require('./routes/deliveryAssignments');
const cohortsRouter = require('./routes/cohorts');

const coursesRouter = express.Router();
coursesRouter.use(deliveryQuizRouter);
coursesRouter.use(deliveryAssignmentsRouter);
coursesRouter.use(coursesBaseRouter);
coursesRouter.use(cohortsRouter);

module.exports = {
  coursesRouter,
  tutorialsRouter: require('./routes/tutorials'),
  cohortsRouter,
};
