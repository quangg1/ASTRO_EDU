const { EventEmitter } = require('events');

const bus = new EventEmitter();

/**
 * Emit an event and await all listeners (supports async listeners).
 * Returns an array of listener results (null/undefined filtered by caller).
 */
async function emitAsync(eventName, payload) {
  const listeners = bus.listeners(eventName);
  const settled = await Promise.all(
    listeners.map(async (listener) => {
      try {
        return await listener(payload);
      } catch (error) {
        return null;
      }
    }),
  );
  return settled;
}

module.exports = {
  bus,
  emitAsync,
  on: bus.on.bind(bus),
};
