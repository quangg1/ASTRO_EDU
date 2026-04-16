class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorMiddleware(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      error: err.message,
      details: err.details,
    });
  }

  console.error('Unhandled API error:', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    error: 'Lỗi máy chủ',
  });
}

module.exports = { AppError, errorMiddleware };
