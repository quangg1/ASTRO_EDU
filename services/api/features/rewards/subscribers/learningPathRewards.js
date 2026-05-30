const { on } = require('../../../services/eventBus');
const { processLearningPathRewardEvent } = require('../services/rewardEngine');

const LISTENER_EVENT = 'learning.event.processed';

let registered = false;

function registerLearningPathRewardSubscriber() {
  if (registered) return;
  on(LISTENER_EVENT, async ({ userId, event }) => processLearningPathRewardEvent(userId, event));
  registered = true;
}

module.exports = {
  registerLearningPathRewardSubscriber,
};
