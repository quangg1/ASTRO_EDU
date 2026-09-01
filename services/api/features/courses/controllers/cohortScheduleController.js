const { asyncController, ok } = require('../../../shared/http');
const schedules = require('../services/cohortScheduleService');

module.exports = asyncController({
  async board(req, res) {
    const data = await schedules.buildScheduleBoard({ course: req.course, cohort: req.cohort });
    return ok(res, { data });
  },

  async applyWeekly(req, res) {
    const { week1OpenAtLocal, daysPerWeek, setDueAndClose } = req.valid.body;
    const data = await schedules.applyWeeklySchedule({
      course: req.course,
      cohort: req.cohort,
      week1OpenLocal: week1OpenAtLocal,
      daysPerWeek,
      setDueAndClose,
    });
    return ok(res, {
      message: `Đã áp lịch theo tuần cho ${data.saved} bài (${data.weekCount} tuần).`,
      data,
    });
  },

  async copyFrom(req, res) {
    const data = await schedules.copySchedulesFromCohort({
      courseId: req.course._id,
      sourceCohortId: req.valid.body.sourceCohortId,
      targetCohortId: req.cohort._id,
    });
    return ok(res, {
      message: `Đã sao chép lịch từ «${data.sourceTitle}» (${data.copied} bài).`,
      data,
    });
  },

  async saveOverrides(req, res) {
    const data = await schedules.saveScheduleOverrides({
      cohort: req.cohort,
      schedules: req.valid.body.schedules,
    });
    return ok(res, { message: 'Đã lưu lịch', data });
  },
});
