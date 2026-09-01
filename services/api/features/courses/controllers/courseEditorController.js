const { asyncController, ok, created } = require('../../../shared/http');
const { parseCourseEditorListResponse } = require('@galaxies/contracts');
const catalog = require('../services/courseCatalogService');
const editor = require('../services/courseEditorService');
const { listTeacherOptions } = require('../../auth/services/userDirectoryService');
const presenter = require('../presenters/coursePresenter');

module.exports = asyncController({
  async listTeachers(_req, res) {
    return ok(res, { data: await listTeacherOptions() });
  },

  async listCourses(req, res) {
    const payload = {
      success: true,
      data: await catalog.listEditorCourses({ userId: req.userId, userRole: req.userRole }),
    };
    // Fails loudly in dev if the response drifts from the shared contract.
    parseCourseEditorListResponse(payload);
    return res.json(payload);
  },

  async create(req, res) {
    const course = await editor.createCourse({
      actor: { id: req.userId, role: req.userRole },
      input: req.valid.body,
    });
    return created(res, { data: presenter.createdCourse(course) });
  },

  async detail(req, res) {
    const course = await editor.getEditorCourse({
      slug: req.params.slug,
      actor: { id: req.userId, role: req.userRole },
    });
    return ok(res, { data: presenter.editorDetail(course) });
  },

  async save(req, res) {
    await editor.saveEditorCourse({
      slug: req.params.slug,
      actor: { id: req.userId, role: req.userRole },
      input: req.valid.body,
    });
    return ok(res, { message: 'Lưu khóa học thành công' });
  },
});
