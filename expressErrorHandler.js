class AppError extends Error
{
  constructor(message, statusCode)
  {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDBCastError = err =>
{
  const message = `💥 Invalid ${err.path}: ${err.value}.`;

  return new AppError(message, 400);
};

const handleDBDuplicateFields = err =>
{
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `💥 Duplicate field value: ${value}.`;

  return new AppError(message, 400);
};

const handleDBValidationError = err =>
{
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `💥 Validation Error${errors.length > 1 ? 's' : ''}: ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please login again.', 401);

const handleExpiredJWTError = () => new AppError('Token already expired. Please login again.', 401);

const sendErrorDev = (err, res) =>
{
  res.status(err.statusCode).json(
  {
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) =>
{
  // Operational, "trusted" error: send message to client
  if (err.isOperational)
  {
    res.status(err.statusCode).json(
    {
      status: err.status,
      message: err.message
    });
  }
  // Programming or other unknown error: don't leak error details
  else
  {
    // 1) Log error
    console.error('💥 ERROR', err);
    // 2) Send generic message
    res.status(500).json({ status: 'error', message: 'Something went very wrong! 😞' });
  }
};

// with 4 parameters, express automatically considers it as an error handling middleware
const globalErrorHandler = (err, req, res, next) =>
{
  // console.log(err.stack);
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development')
  {
    sendErrorDev(err, res);
  }
  else if (process.env.NODE_ENV === 'production')
  {
    let error = Object.assign(err);
    
    if (error.name === 'CastError') error = handleDBCastError(error);

    if (error.code === 11000) error = handleDBDuplicateFields(error);

    if (error.name === 'ValidationError') error = handleDBValidationError(error);

    if (error.name === 'JsonWebTokenError') error = handleJWTError();

    if (error.name === 'TokenExpiredError') error = handleExpiredJWTError();

    sendErrorProd(error, res);
  }
};

const asyncCatch = fn => (req, res, next) => fn(req, res, next).catch(next);

const handleUncaughtExceptionUnhandledRejection = (err, server) =>
{
  console.log(`💥 ${server ? 'UNHANDLED REJECTION' : 'UNCAUGHT EXCEPTION'}! Shutting down...`);
  console.log(err.name, err.message);
  
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
};

const invalidRoutesHandler = (req, res, next) =>
{
  next(new AppError(`💥 Can't find ${req.originalUrl} on this server!`, 404));  // if an argument is passed in the next function, it will be automatically considered as an error object
};

const uncaughtExceptionHandler = () =>
{
  process.on('uncaughtException', err => handleUncaughtExceptionUnhandledRejection(err));
};

const unhandledRejectionHandler = (server = null) =>
{
  process.on('uncaughtException', err => handleUncaughtExceptionUnhandledRejection(err, server));
};

module.exports = { AppError, globalErrorHandler, asyncCatch, invalidRoutesHandler, uncaughtExceptionHandler, unhandledRejectionHandler };