const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const {
  getOnboardingStatus,
  completeOnboarding,
  ONBOARDING_INTENTS,
  EXPERIENCE_LEVELS,
  VALID_TOPIC_IDS,
  MAX_TOPIC_PICKS,
} = require('../services/onboardingService');
const { LEARNING_TOPICS } = require('../constants/learningTopicsCatalog');

const router = express.Router();

router.get('/options', (_req, res) => {
  res.json({
    success: true,
    data: {
      intents: ONBOARDING_INTENTS,
      experienceLevels: EXPERIENCE_LEVELS,
      topics: LEARNING_TOPICS,
      maxTopicPicks: MAX_TOPIC_PICKS,
      validTopicIds: VALID_TOPIC_IDS,
    },
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const profile = await getOnboardingStatus(req.userId);
    res.json({
      success: true,
      data: {
        completed: Boolean(profile?.completed),
        profile,
      },
    });
  } catch (err) {
    console.error('GET /onboarding/me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const result = await completeOnboarding(req.userId, req.body || {}, { skip: false });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('POST /onboarding/complete error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.post('/skip', authMiddleware, async (req, res) => {
  try {
    const result = await completeOnboarding(req.userId, {}, { skip: true });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('POST /onboarding/skip error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

module.exports = router;
