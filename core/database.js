// core/database.js
const { activeORM } = require('../config/orm');
const logger = require('../utils/logger');

async function initializeDatabase() {
  try {
    logger.info(`Initializing database connection for ${activeORM}`);
    
    switch (activeORM) {
      case 'sequelize':
        return await initializeSequelize();
      case 'mongoose':
        return await initializeMongoose();
      case 'prisma':
        return await initializePrisma();
      default:
        throw new Error(`Unsupported ORM: ${activeORM}`);
    }
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}


async function initializeSequelize() {
  const { Sequelize } = require('sequelize');
  const config = require('../config/database');
  
  // First try to connect directly
  try {
    const sequelize = new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: (msg) => logger.debug(msg),
      pool: config.pool || {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
    
    await sequelize.authenticate();
    return sequelize;
  } catch (error) {
    if (error.original && error.original.code === 'ER_BAD_DB_ERROR') {
      // Database doesn't exist - create it
      logger.warn(`Database ${config.database} doesn't exist, attempting to create it...`);
      return await createDatabaseAndConnect(config);
    }
    throw error;
  }
}



async function createDatabaseAndConnect(config) {
  const { Sequelize } = require('sequelize');
  
  // Create admin connection without specifying database
  const adminSequelize = new Sequelize('', config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: false
  });

  try {
    // Create the database
    switch (config.dialect) {
      case 'mysql':
        await adminSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
        break;
      case 'postgres':
        await adminSequelize.query(`CREATE DATABASE "${config.database}";`);
        break;
      case 'mssql':
        await adminSequelize.query(`CREATE DATABASE [${config.database}];`);
        break;
      default:
        throw new Error(`Database creation not supported for dialect: ${config.dialect}`);
    }
    logger.info(`Successfully created database: ${config.database}`);
  } finally {
    await adminSequelize.close();
  }

  // Now connect to the new database
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: (msg) => logger.debug(msg),
    pool: config.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  await sequelize.authenticate();
  return sequelize;
}

async function initializeMongoose() {
  const mongoose = require('mongoose');
  const config = require('../config/database');
  
  mongoose.connection.on('connected', () => {
    logger.debug('Mongoose connected to DB');
  });
  
  mongoose.connection.on('error', (err) => {
    logger.error('Mongoose connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose disconnected from DB');
  });

  await mongoose.connect(config.uri || config, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  return mongoose;
}

async function initializePrisma() {
  const { PrismaClient } = require('@prisma/client');
  
  const prisma = new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'error', emit: 'event' }
    ]
  });
  
  prisma.$on('warn', (e) => logger.warn(e.message));
  prisma.$on('info', (e) => logger.info(e.message));
  prisma.$on('error', (e) => logger.error(e.message));
  
  await prisma.$connect();
  return prisma;
}

module.exports = {
  initializeDatabase
};