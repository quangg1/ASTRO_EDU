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

  if (err && err.name === 'MulterError') {
    console.error('Multer error:', err);
    const byCode = {
      LIMIT_FILE_SIZE: 'File quá lớn (tối đa 20 MB).',
      LIMIT_UNEXPECTED_FILE: 'Field upload phải là "file".',
    };
    return res.status(400).json({
      success: false,
      code: err.code || 'MULTER_ERROR',
      error: byCode[err.code] || err.message || 'Upload không hợp lệ',
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    console.error('Body parse error:', err.message);
    return res.status(400).json({
      success: false,
      code: 'INVALID_BODY',
      error: 'Dữ liệu gửi lên không hợp lệ — thử tải lại trang.',
    });
  }

  if (err && err.name === 'CastError') {
    console.error('Cast error:', err);
    return res.status(401).json({
      success: false,
      code: 'INVALID_SESSION',
      error: 'Phiên đăng nhập không hợp lệ — đăng xuất và đăng nhập lại.',
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
