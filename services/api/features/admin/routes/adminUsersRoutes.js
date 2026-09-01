const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope, requireFullAdmin } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const users = require('../controllers/adminUserController');

const router = express.Router();

const manageUsers = [authMiddleware, requireAdminScope('users')];

router.get('/', ...manageUsers, validate({ query: schema.listUsersQuery }), users.list);

router.get('/:id/detail', ...manageUsers, validate({ params: schema.userIdParams }), users.detail);

router.get('/:id/wallet', ...manageUsers, validate({ params: schema.userIdParams }), users.wallet);

router.patch(
  '/:id/role',
  ...manageUsers,
  validate({ params: schema.userIdParams, body: schema.updateRoleBody }),
  users.updateRole,
);

router.patch(
  '/:id/status',
  ...manageUsers,
  validate({ params: schema.userIdParams, body: schema.updateStatusBody }),
  users.updateStatus,
);

router.post(
  '/:id/send-password-reset',
  ...manageUsers,
  validate({ params: schema.userIdParams }),
  users.sendPasswordReset,
);

router.delete(
  '/:id',
  ...manageUsers,
  validate({ params: schema.userIdParams, body: schema.deleteUserBody }),
  users.remove,
);

// Granting admin scopes is an escalation path, so it needs unrestricted admin.
router.patch(
  '/:id/scopes',
  authMiddleware,
  requireFullAdmin(),
  validate({ params: schema.userIdParams, body: schema.updateScopesBody }),
  users.updateScopes,
);

module.exports = router;
