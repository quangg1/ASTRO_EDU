const { runOrderMaintenance } = require('../lib/orderMaintenance');

const INTERVAL_MS = 15 * 60 * 1000;

function startOrderMaintenanceScheduler(logger) {
  const tick = () => {
    runOrderMaintenance()
      .then((result) => {
        if ((result.expired || 0) + (result.superseded || 0) > 0) {
          logger?.info?.('order_maintenance_completed', result);
        }
      })
      .catch((err) => {
        logger?.error?.('order_maintenance_failed', { error: err?.message || String(err) });
      });
  };

  tick();
  setInterval(tick, INTERVAL_MS);
  logger?.info?.('order_maintenance_scheduler_started', { intervalMinutes: INTERVAL_MS / 60000 });
}

module.exports = { startOrderMaintenanceScheduler, INTERVAL_MS };
