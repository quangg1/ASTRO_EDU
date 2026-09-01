const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const gems = require('../controllers/gemsController');

const router = express.Router();

router.get('/learner-tiers', gems.learnerTiers);
router.get('/shop/bootstrap', gems.shopBootstrap);
router.get('/shop/catalog', gems.shopCatalog);
router.get('/decorations/catalog', gems.decorationCatalog);

router.get('/decorations/me', authMiddleware, gems.myDecorations);
router.post('/decorations/purchase', authMiddleware, gems.purchaseDecoration);
router.patch('/decorations/equip', authMiddleware, gems.equipDecoration);
router.get('/wallet', authMiddleware, gems.wallet);

module.exports = router;
