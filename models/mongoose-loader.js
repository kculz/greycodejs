// models/mongoose-loader.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Initialize and load all Mongoose models
 * @param {mongoose} mongooseInstance - Mongoose instance
 * @returns {object} Object containing all loaded models
 */
function initializeMongooseModels(mongooseInstance) {
  const models = {};
  const modelsPath = __dirname;
  
  try {
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
        const modelModule = require(modelPath);
        
        // Mongoose models can be defined in different ways
        if (typeof modelModule === 'function') {
          // If it's a function, call it with mongoose
          const model = modelModule(mongooseInstance);
          if (model && model.modelName) {
            models[model.modelName] = model;
            logger.debug(`Loaded Mongoose model: ${model.modelName}`);
          }
        } else if (modelModule.modelName) {
          // If it's already a model
          models[modelModule.modelName] = modelModule;
          logger.debug(`Loaded Mongoose model: ${modelModule.modelName}`);
        } else {
          logger.warn(`Skipping ${file}: not a valid Mongoose model`);
        }
      } catch (error) {
        logger.error(`Error loading model ${file}:`, error);
      }
    });

    logger.info(`Successfully loaded ${Object.keys(models).length} Mongoose model(s)`);
    
    // Attach mongoose instance
    models.mongoose = mongooseInstance;

    return models;
  } catch (error) {
    logger.error('Failed to initialize Mongoose models:', error);
    throw error;
  }
}

module.exports = initializeMongooseModels;