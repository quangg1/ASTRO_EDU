const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/promoSchemas');
const promos = require('../controllers/promoAdminController');

const router = express.Router();

router.use(authMiddleware, requireAdminScope('promo'));

router.get('/', promos.list);
router.post('/', validate({ body: schema.promoBody }), promos.create);
router.patch(
  '/:id',
  validate({ params: schema.promoIdParams, body: schema.promoBody }),
  promos.update,
);
router.delete('/:id', validate({ params: schema.promoIdParams }), promos.remove);

module.exports = router;
