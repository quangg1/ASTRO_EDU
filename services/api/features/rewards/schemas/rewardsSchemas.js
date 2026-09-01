const { z, schemas } = require('../../../shared/http');

const { trimmedString } = schemas;

const unlockBody = z.object({
  entityId: trimmedString(120, 'entityId'),
  contentType: z.enum(['story', 'orbit'], { message: 'contentType không hợp lệ' }),
});

module.exports = { unlockBody };
