// core/orm/sequelize.js
const { Sequelize } = require('sequelize');
const logger = require('../../utils/logger');
const { database, username, password, host, port, dialect } = require("../database");

module.exports = {
  async initialize() {
    const sequelize = new Sequelize(database, username, password, {
        host,
        port,
        dialect,
        logging: (msg) => logger.debug(msg),
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });
    
    try {
      await sequelize.authenticate();
      logger.info('Sequelize connected successfully');
      return sequelize;
    } catch (error) {
      logger.error('Sequelize connection error:', error);
      throw error;
    }
  }
};