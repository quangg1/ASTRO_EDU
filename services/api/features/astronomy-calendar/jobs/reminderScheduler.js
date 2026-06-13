const { processDueReminders } = require('../services/engagementService');

const INTERVAL_MS = 15 * 60 * 1000;
let timer = null;

function startAstronomyReminderScheduler() {
  if (process.env.ASTRONOMY_REMINDER_SCHEDULER === '0') return;
  if (timer) return;

  const tick = async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('[astronomy-reminder] tick error:', err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = { startAstronomyReminderScheduler };
