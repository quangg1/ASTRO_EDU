const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/astronomyAdminSchemas');
const events = require('../controllers/astronomyAdminController');

const router = express.Router();

router.use(authMiddleware, requireAdminScope('system'));

router.get('/type-kits', events.listTypeKits);
router.patch(
  '/type-kits/:type',
  validate({ params: schema.typeKitParams }),
  events.updateTypeKit,
);

router.get('/', events.listEvents);
router.post('/', validate({ body: schema.createEventBody }), events.createEvent);

router.post(
  '/import-suggestions',
  validate({ body: schema.importSuggestionsBody }),
  events.importSuggestions,
);

router.patch(
  '/:id',
  validate({ params: schema.eventIdParams, body: schema.updateEventBody }),
  events.updateEvent,
);
router.post(
  '/:id/publish',
  validate({ params: schema.eventIdParams }),
  events.publishEvent,
);
router.delete('/:id', validate({ params: schema.eventIdParams }), events.deleteEvent);

module.exports = router;
