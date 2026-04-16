function serializeMeta(meta = {}) {
  return Object.fromEntries(
    Object.entries(meta).filter(([, value]) => value !== undefined)
  );
}

function log(level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...serializeMeta(meta),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
}

function child(baseMeta = {}) {
  return {
    info(message, meta) {
      log('info', message, { ...baseMeta, ...meta });
    },
    warn(message, meta) {
      log('warn', message, { ...baseMeta, ...meta });
    },
    error(message, meta) {
      log('error', message, { ...baseMeta, ...meta });
    },
  };
}

module.exports = {
  logger: {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    child,
  },
};
