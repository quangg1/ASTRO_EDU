const express = require('express');
const learningStateRoutes = require('./routes/learningState');

const learningStateRouter = express.Router();
learningStateRouter.use(learningStateRoutes);

module.exports = { learningStateRouter };
