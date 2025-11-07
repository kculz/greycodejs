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
    // Check if models directory exists
    if (!fs.existsSync(modelsPath)) {
      logger.warn(`Models directory does not exist: ${modelsPath}`);
      models.mongoose = mongooseInstance;
      return models;
    }

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

    if (files.length === 0) {
      logger.warn('No Mongoose model files found in models directory');
      logger.info('Create models with: npm run cli -- create-model <ModelName>');
    }

    // Import all model files
    files.forEach(file => {
      try {
        const modelPath = path.join(modelsPath, file);
        
        // Clear require cache to allow hot reloading in development
        delete require.cache[require.resolve(modelPath)];
        
        const modelModule = require(modelPath);
        
        // Mongoose models can be defined in different ways
        if (typeof modelModule === 'function') {
          // If it's a function, call it with mongoose instance
          try {
            const model = modelModule(mongooseInstance);
            if (model && model.modelName) {
              models[model.modelName] = model;
              logger.debug(`Loaded Mongoose model: ${model.modelName} from ${file}`);
            } else {
              logger.warn(`Function in ${file} did not return a valid Mongoose model`);
            }
          } catch (error) {
            logger.error(`Error calling model function in ${file}:`, error.message);
          }
        } else if (modelModule.modelName) {
          // If it's already a Mongoose model (exported directly)
          models[modelModule.modelName] = modelModule;
          logger.debug(`Loaded Mongoose model: ${modelModule.modelName} from ${file}`);
        } else if (modelModule.schema && modelModule.schema.obj) {
          // If it's a schema definition object, create the model
          const modelName = path.basename(file, '.js');
          const capitalizedName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
          
          try {
            const model = mongooseInstance.model(capitalizedName, modelModule.schema);
            models[capitalizedName] = model;
            logger.debug(`Created and loaded Mongoose model: ${capitalizedName} from ${file}`);
          } catch (error) {
            // Model might already exist
            if (error.name === 'OverwriteModelError') {
              const existingModel = mongooseInstance.model(capitalizedName);
              models[capitalizedName] = existingModel;
              logger.debug(`Loaded existing Mongoose model: ${capitalizedName}`);
            } else {
              throw error;
            }
          }
        } else {
          logger.warn(`Skipping ${file}: not a valid Mongoose model (no modelName, function, or schema found)`);
        }
      } catch (error) {
        logger.error(`Error loading model ${file}:`, error.message);
        if (process.env.NODE_ENV === 'development') {
          logger.error('Stack trace:', error.stack);
        }
      }
    });

    const modelCount = Object.keys(models).filter(key => key !== 'mongoose').length;
    
    if (modelCount > 0) {
      logger.info(`Successfully loaded ${modelCount} Mongoose model(s)`);
    } else {
      logger.warn('No Mongoose models were loaded');
      logger.info('Available model files found: ' + files.join(', '));
    }
    
    // Attach mongoose instance for direct access
    models.mongoose = mongooseInstance;

    return models;
  } catch (error) {
    logger.error('Failed to initialize Mongoose models:', error);
    throw error;
  }
}

/**
 * Helper function to validate Mongoose model
 * @param {any} model 
 * @returns {boolean}
 */
function isValidMongooseModel(model) {
  return (
    model &&
    typeof model === 'function' &&
    model.modelName &&
    model.schema &&
    typeof model.find === 'function'
  );
}

module.exports = initializeMongooseModels;