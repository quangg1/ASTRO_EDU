const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/notificationSchemas');
const notifications = require('../controllers/notificationController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validate({ query: schema.inboxQuery }), notifications.list);
router.get('/unread-count', notifications.unreadCount);
router.patch(
  '/:id/read',
  validate({ params: schema.notificationIdParams }),
  notifications.markRead,
);
router.post('/read-all', notifications.markAllRead);

module.exports = router;
