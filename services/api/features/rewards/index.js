const gemsRouter = require('./routes/gems');
const showcaseGamificationRouter = require('./routes/showcaseGamification');
const { registerLearningPathRewardSubscriber } = require('./subscribers/learningPathRewards');

registerLearningPathRewardSubscriber();

module.exports = {
  gemsRouter,
  showcaseGamificationRouter,
};
