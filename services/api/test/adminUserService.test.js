const test = require('node:test');
const assert = require('node:assert/strict');
const { updateAdminUserRole, updateAdminUserStatus } = require('../services/adminUserService');

test('updateAdminUserRole rejects admin self-demotion', async () => {
  await assert.rejects(
    () =>
      updateAdminUserRole({
        actorUserId: 'admin-1',
        targetUserId: 'admin-1',
        role: 'teacher',
      }),
    (error) => error.code === 'SELF_DEMOTION_FORBIDDEN'
  );
});

test('updateAdminUserStatus rejects admin self-deactivation', async () => {
  await assert.rejects(
    () =>
      updateAdminUserStatus({
        actorUserId: 'admin-1',
        targetUserId: 'admin-1',
        accountStatus: 'deactivated',
      }),
    (error) => error.code === 'SELF_DEACTIVATION_FORBIDDEN'
  );
});
