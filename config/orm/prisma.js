// core/orm/prisma.js
const { PrismaClient } = require('@prisma/client');
const prismaConfig = require('../../config/orm').prisma;
const logger = require('../../utils/logger');


module.exports = {
  async initialize() {
    const prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
      ],
      ...prismaConfig
    });

    try {
      await prisma.$connect();
      logger.info('Prisma connected successfully');
      return prisma;
    } catch (error) {
      logger.error('Prisma connection error:', error);
      throw error;
    }
  }
};