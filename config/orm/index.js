// core/orm/index.js
const { activeORM } = require('../../config/orm');
const logger = require('../../utils/logger');

class ORMFactory {
  static async initialize() {
    try {
      switch (activeORM) {
        case 'sequelize':
          const SequelizeORM = require('./sequelize');
          return await SequelizeORM.initialize();
        case 'mongoose':
          const MongooseORM = require('./mongoose');
          return await MongooseORM.initialize();
        case 'prisma':
          const PrismaORM = require('./prisma');
          return await PrismaORM.initialize();
        default:
          throw new Error(`Unsupported ORM: ${activeORM}`);
      }
    } catch (error) {
      logger.error('ORM initialization failed:', error);
      throw error;
    }
  }
}

module.exports = ORMFactory;