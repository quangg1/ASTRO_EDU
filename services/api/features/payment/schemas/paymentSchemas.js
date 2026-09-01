const { z, schemas } = require('../../../shared/http');

const { objectId, trimmedString } = schemas;

const optionalToken = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const checkoutFields = {
  courseId: objectId,
  voucherTierId: optionalToken(64),
  promoCode: optionalToken(64),
  cohortId: optionalToken(64),
};

const checkoutQuoteQuery = z.object(checkoutFields);
const checkoutBody = z.object(checkoutFields);

const txnRefParams = z.object({ txnRef: trimmedString(64, 'txnRef') });

const confirmBody = z.object({
  paymentMethod: z
    .string()
    .trim()
    .toLowerCase()
    .catch('card')
    .default('card'),
});

module.exports = { checkoutQuoteQuery, checkoutBody, txnRefParams, confirmBody };
