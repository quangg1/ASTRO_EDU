const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/rewardsSchemas');
const showcase = require('../controllers/showcaseUnlockController');

const router = express.Router();

router.get('/catalog', authMiddleware, showcase.catalog);
router.get('/unlocks', authMiddleware, showcase.unlocks);
router.post('/unlock', authMiddleware, validate({ body: schema.unlockBody }), showcase.unlock);

module.exports = router;
