const { asyncController, ok, created } = require('../../../shared/http');
const entities = require('../services/showcaseEntityService');

module.exports = asyncController({
  async listPublished(_req, res) {
    return ok(res, { data: await entities.listPublishedEntities() });
  },

  async listForEditor(_req, res) {
    return ok(res, { data: await entities.listEntitiesForEditor() });
  },

  async save(req, res) {
    return ok(res, { data: await entities.saveEntities(req.valid.body.items) });
  },

  async create(req, res) {
    return created(res, { data: await entities.createEntity(req.valid.body) });
  },

  async remove(req, res) {
    const result = await entities.deleteEntity(req.valid.params.entityId, {
      cascade: req.valid.query.cascade,
    });

    // Client đọc `childIds` ở gốc body để hỏi người dùng có xóa cả con không.
    if (result.status === 'has_children') {
      return res.status(409).json({
        success: false,
        error: `Entity có ${result.childIds.length} mục con. Thêm ?cascade=1 để xóa cả con.`,
        childIds: result.childIds,
      });
    }

    return ok(res, { data: { items: result.items, removedIds: result.removedIds } });
  },
});
