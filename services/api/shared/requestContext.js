const { randomUUID } = require('crypto');
const { logger } = require('./logger');

function requestContextMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const startedAt = Date.now();
  const requestLogger = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
  });

  req.requestId = requestId;
  req.logger = requestLogger;
  res.setHeader('x-request-id', requestId);

  requestLogger.info('request_started');
  res.on('finish', () => {
    requestLogger.info('request_finished', {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}

module.exports = { requestContextMiddleware };
