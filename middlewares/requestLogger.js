// middlewares/requestLogger.js
const morgan = require('morgan');
const logger = require('../utils/logger');

module.exports = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream: logger.stream }
);