// models/index.js
const { activeORM } = require('../config/orm');
const logger = require('../utils/logger');

/**
 * Initialize models based on active ORM
 * @param {Object} dbInstance - Database instance (Sequelize/Mongoose/Prisma)
 * @returns {Object} Object containing all loaded models
 */
function initializeModels(dbInstance) {
  try {
    logger.info(`Initializing models for ${activeORM.toUpperCase()}...`);

    switch (activeORM) {
      case 'sequelize':
        return initializeSequelizeModels(dbInstance);
      
      case 'mongoose':
        return initializeMongooseModels(dbInstance);
      
      case 'prisma':
        return initializePrismaModels(dbInstance);
      
      default:
        throw new Error(`Unsupported ORM: ${activeORM}`);
    }
  } catch (error) {
    logger.error('Model initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize Sequelize models
 * @param {Sequelize} sequelize 
 * @returns {Object}
 */
function initializeSequelizeModels(sequelize) {
  const fs = require('fs');
  const path = require('path');
  const { Sequelize } = require('sequelize');

  const models = {};
  const modelsPath = __dirname;
  
  // Read all files in models directory
  const files = fs.readdirSync(modelsPath)
    .filter(file => {
      return (
        file.indexOf('.') !== 0 &&
        file !== 'index.js' &&
        file !== 'models.js' &&
        file !== 'mongoose-loader.js' &&
        file !== 'prisma-loader.js' &&
        file.slice(-3) === '.js'
      );
    });

  // Import all model files
  files.forEach(file => {
    try {
      const modelPath = path.join(modelsPath, file);
      const modelDefiner = require(modelPath);
      
      // Check if the file exports a function (Sequelize model definer)
      if (typeof modelDefiner === 'function') {
        const model = modelDefiner(sequelize, Sequelize.DataTypes);
        models[model.name] = model;
        logger.debug(`Loaded Sequelize model: ${model.name}`);
      } else {
        logger.warn(`Skipping ${file}: does not export a model definer function`);
      }
    } catch (error) {
      logger.error(`Error loading model ${file}:`, error);
    }
  });

  // Set up associations if they exist
  Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
      try {
        models[modelName].associate(models);
        logger.debug(`Set up associations for: ${modelName}`);
      } catch (error) {
        logger.error(`Error setting up associations for ${modelName}:`, error);
      }
    }
  });

  logger.info(`Successfully loaded ${Object.keys(models).length} Sequelize model(s)`);
  
  // Attach sequelize instance and Sequelize class
  models.sequelize = sequelize;
  models.Sequelize = Sequelize;

  return models;
}

/**
 * Initialize Mongoose models
 * @param {mongoose} mongooseInstance 
 * @returns {Object}
 */
function initializeMongooseModels(mongooseInstance) {
  const mongooseLoader = require('./mongoose-loader');
  return mongooseLoader(mongooseInstance);
}

/**
 * Initialize Prisma models
 * @param {PrismaClient} prismaInstance 
 * @returns {Object}
 */
function initializePrismaModels(prismaInstance) {
  const prismaLoader = require('./prisma-loader');
  return prismaLoader(prismaInstance);
}

module.exports = initializeModels;