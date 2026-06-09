const errorHandler = (error, req, res, next) => {
  console.error(`[${req.method}] ${req.path} —`, error.message);
  const code    = error.statusCode || 500;
  const message = error.message    || 'Internal server error';
  res.status(code).json({
    success: false, message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, AppError };
