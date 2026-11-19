const AppError = require('../utils/AppError');

const DB_DOWN = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET',
  'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_CON_COUNT_ERROR', 'POOL_CLOSED'];

function notFound(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on the server.';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON.';
  } else if (DB_DOWN.includes(err.code)) {
    status = 503; code = 'DATABASE_UNAVAILABLE'; message = 'The database is currently unavailable. Please try again shortly.';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409; code = 'DUPLICATE_RECORD'; message = 'A record with the same unique value (name or phone) already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400; code = 'INVALID_REFERENCE'; message = 'A referenced record (supplier, vendor or fruit) does not exist.';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409; code = 'RECORD_IN_USE'; message = 'This record is used by other records and cannot be deleted.';
  } else if (err.errno === 3819 || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    status = 400; code = 'CONSTRAINT_VIOLATION'; message = 'A value broke a database rule (for example, stock cannot go below zero).';
  }

  if (status >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(status).json({ success: false, error: { code, message, ...(details && { details }) } });
}

module.exports = { notFound, errorHandler };
