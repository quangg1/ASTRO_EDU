const AgentMessageFeedback = require('../models/AgentMessageFeedback');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');

async function recordMessageFeedback(userId, body) {
  const rating = Number(body?.rating);
  if (rating !== 1 && rating !== -1) {
    const err = new Error('rating phải là 1 hoặc -1');
    err.status = 400;
    throw err;
  }

  const doc = await AgentMessageFeedback.create({
    userId: String(userId),
    sessionId: String(body?.sessionId || '').trim(),
    messageId: String(body?.messageId || '').trim(),
    rating,
    comment: typeof body?.comment === 'string' ? body.comment.trim().slice(0, 500) : '',
    surface: typeof body?.surface === 'string' ? body.surface.trim() : '',
    lessonId: typeof body?.lessonId === 'string' ? body.lessonId.trim() : '',
  });

  const inc =
    rating === 1
      ? { 'proceduralMemory.feedbackThumbsUp': 1 }
      : { 'proceduralMemory.feedbackThumbsDown': 1 };

  await LearnerAgentProfile.findOneAndUpdate(
    { userId: String(userId) },
    {
      $inc: inc,
      $setOnInsert: { userId: String(userId) },
    },
    { upsert: true },
  ).catch(() => {});

  return { id: String(doc._id), rating };
}

module.exports = { recordMessageFeedback };
