const express = require('express');
const agentRoutes = require('./routes/agent');

const agentRouter = express.Router();
agentRouter.use(agentRoutes);

module.exports = { agentRouter };
