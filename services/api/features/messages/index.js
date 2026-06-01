const express = require('express');
const { authMiddleware } = require('../../shared/jwtAuth');
const {
  listConversations,
  listMessages,
  sendDirectMessage,
  openConversationWithUser,
} = require('./services/dmService');

const router = express.Router();

router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const data = await listConversations(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('GET /api/messages/conversations error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/conversations/:conversationId', authMiddleware, async (req, res) => {
  try {
    const messages = await listMessages(req.params.conversationId, req.userId, {
      before: req.query.before,
      limit: req.query.limit,
    });
    res.json({ success: true, data: { messages } });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('GET /api/messages/conversations/:id error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/open', authMiddleware, async (req, res) => {
  try {
    const otherUserId = req.body?.userId || req.body?.recipientId;
    const data = await openConversationWithUser(req.userId, otherUserId);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('POST /api/messages/open error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const data = await sendDirectMessage(req.userId, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('POST /api/messages/send error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
