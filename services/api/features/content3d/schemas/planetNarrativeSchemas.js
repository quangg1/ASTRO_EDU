const { z, schemas } = require('../../../shared/http');

const { trimmedString } = schemas;

const entityIdParams = z.object({ entityId: trimmedString(80, 'entityId') });

/** Beats/sites/panelSchema là dữ liệu tự do của editor; service mới chuẩn hóa. */
const looseRow = z.record(z.string(), z.unknown());

const saveNarrativeBody = looseRow.and(
  z.object({ entityId: trimmedString(80, 'entityId') }),
);

module.exports = { entityIdParams, saveNarrativeBody };
