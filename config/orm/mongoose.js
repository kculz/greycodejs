// core/orm/mongoose.js
const mongoose = require('mongoose');
const mongooseConfig = require('../../config/orm').mongoose;
const logger = require('../../utils/logger');


module.exports = {
  async initialize() {
    try {
      await mongoose.connect(mongooseConfig.uri, mongooseConfig.options);
      logger.info('Mongoose connected successfully');
      return mongoose;
    } catch (error) {
      logger.error('Mongoose connection error:', error);
      throw error;
    }
  }
};