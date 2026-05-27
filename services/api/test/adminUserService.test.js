const test = require('node:test');
const assert = require('node:assert/strict');
const {
  updateAdminUserRole,
  updateAdminUserStatus,
  deleteAdminUserPermanently,
} = require('../features/admin/services/adminUserService');

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

test('deleteAdminUserPermanently rejects self-delete', async () => {
  await assert.rejects(
    () =>
      deleteAdminUserPermanently({
        actorUserId: 'admin-1',
        targetUserId: 'admin-1',
        confirmEmail: 'a@b.com',
        reason: 'Lý do xóa đủ dài để test',
      }),
    (error) => error.code === 'SELF_DELETE_FORBIDDEN'
  );
});

test('deleteAdminUserPermanently requires reason length', async () => {
  await assert.rejects(
    () =>
      deleteAdminUserPermanently({
        actorUserId: 'admin-1',
        targetUserId: 'other-user',
        confirmEmail: 'x@y.com',
        reason: 'ngắn',
      }),
    (error) => error.code === 'REASON_REQUIRED'
  );
});
