/**
 * HTTP transport kernel shared by every feature router.
 * Controllers depend on this module only — never on Express internals directly.
 */
const { asyncHandler, asyncController } = require('./asyncHandler');
const { ok, created, noContent, paginated } = require('./respond');
const { validate, schemas, z } = require('./validate');

module.exports = {
  asyncHandler,
  asyncController,
  ok,
  created,
  noContent,
  paginated,
  validate,
  schemas,
  z,
};
