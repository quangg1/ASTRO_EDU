const { ZodError } = require('zod');

/**
 * Operational error carrying the HTTP contract (status + stable machine code).
 * Domain/service layers throw these; the transport layer never has to translate.
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Yêu cầu không hợp lệ', details) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validation(message = 'Dữ liệu không hợp lệ', details) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Bạn cần đăng nhập', details) {
    return new AppError(401, 'UNAUTHORIZED', message, details);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này', details) {
    return new AppError(403, 'FORBIDDEN', message, details);
  }

  static notFound(message = 'Không tìm thấy dữ liệu', details) {
    return new AppError(404, 'NOT_FOUND', message, details);
  }

  static conflict(message = 'Dữ liệu đã tồn tại hoặc đang xung đột', details) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static unprocessable(message = 'Không thể xử lý yêu cầu', details) {
    return new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }

  static tooManyRequests(message = 'Bạn thao tác quá nhanh, thử lại sau', details) {
    return new AppError(429, 'TOO_MANY_REQUESTS', message, details);
  }

  static internal(message = 'Lỗi máy chủ', details) {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

/** Flatten a ZodError into a field -> messages map the client can render inline. */
function formatZodIssues(error) {
  const fieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    (fieldErrors[path] ||= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * Map any thrown value to the single response envelope
 * `{ success: false, code, error, details? }`.
 */
function toErrorResponse(err) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { success: false, code: err.code, error: err.message, details: err.details },
      level: err.status >= 500 ? 'error' : 'warn',
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Dữ liệu gửi lên không hợp lệ',
        details: formatZodIssues(err),
      },
      level: 'warn',
    };
  }

  if (err?.name === 'MulterError') {
    const byCode = {
      LIMIT_FILE_SIZE: 'File quá lớn (tối đa 20 MB).',
      LIMIT_UNEXPECTED_FILE: 'Field upload phải là "file".',
    };
    return {
      status: 400,
      body: {
        success: false,
        code: err.code || 'MULTER_ERROR',
        error: byCode[err.code] || err.message || 'Upload không hợp lệ',
      },
      level: 'warn',
    };
  }

  if (err?.type === 'entity.parse.failed') {
    return {
      status: 400,
      body: {
        success: false,
        code: 'INVALID_BODY',
        error: 'Dữ liệu gửi lên không hợp lệ — thử tải lại trang.',
      },
      level: 'warn',
    };
  }

  // Mongoose schema validation reaching the transport layer.
  if (err?.name === 'ValidationError' && err.errors) {
    return {
      status: 400,
      body: {
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Dữ liệu không hợp lệ',
        details: Object.fromEntries(
          Object.entries(err.errors).map(([field, e]) => [field, [e.message]]),
        ),
      },
      level: 'warn',
    };
  }

  // Duplicate key on a unique index.
  if (err?.code === 11000) {
    return {
      status: 409,
      body: {
        success: false,
        code: 'DUPLICATE_KEY',
        error: 'Dữ liệu đã tồn tại',
        details: err.keyValue,
      },
      level: 'warn',
    };
  }

  if (err?.name === 'CastError') {
    return {
      status: 400,
      body: {
        success: false,
        code: 'INVALID_IDENTIFIER',
        error: 'Định danh không hợp lệ',
        details: { path: err.path },
      },
      level: 'warn',
    };
  }

  return {
    status: 500,
    body: { success: false, code: 'INTERNAL_SERVER_ERROR', error: 'Lỗi máy chủ' },
    level: 'error',
  };
}

function errorMiddleware(err, req, res, _next) {
  const { status, body, level } = toErrorResponse(err);
  const log = req?.logger || console;

  const meta = { code: body.code, status, requestId: req?.requestId };
  if (level === 'error') {
    (log.error || console.error).call(log, 'request_failed', {
      ...meta,
      message: err?.message,
      stack: err?.stack,
    });
  } else {
    (log.warn || console.warn).call(log, 'request_rejected', { ...meta, message: err?.message });
  }

  if (res.headersSent) return _next(err);
  return res.status(status).json(body);
}

/** 404 fallthrough so unknown routes share the error envelope instead of Express HTML. */
function notFoundMiddleware(req, _res, next) {
  next(AppError.notFound(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`));
}

module.exports = {
  AppError,
  errorMiddleware,
  notFoundMiddleware,
  toErrorResponse,
  formatZodIssues,
};
