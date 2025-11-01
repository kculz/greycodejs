// models/index.js
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Initialize and load all Sequelize models
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {object} Object containing all loaded models
 */
function initializeModels(sequelize) {
  const models = {};
  const modelsPath = __dirname;
  
  try {
    // Read all files in models directory
    const files = fs.readdirSync(modelsPath)
      .filter(file => {
        return (
          file.indexOf('.') !== 0 &&
          file !== 'index.js' &&
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
          logger.debug(`Loaded model: ${model.name}`);
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

    logger.info(`Successfully loaded ${Object.keys(models).length} model(s)`);
    
    // Attach sequelize instance and Sequelize class to models object
    models.sequelize = sequelize;
    models.Sequelize = Sequelize;

    return models;
  } catch (error) {
    logger.error('Failed to initialize models:', error);
    throw error;
  }
}

module.exports = initializeModels;