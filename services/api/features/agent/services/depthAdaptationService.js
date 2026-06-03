const {
  evaluateDepthSuggestion,
  recordDepthPreference,
} = require('../../learning-state/services/learningStateEngine');

const DEPTH_ORDER = ['beginner', 'explorer', 'researcher'];

module.exports = {
  evaluateDepthSuggestion,
  recordDepthPreference,
  DEPTH_ORDER,
};
