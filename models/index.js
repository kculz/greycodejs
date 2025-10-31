// models/index.js
const fs = require('fs');
const path = require('path');
const { activeORM } = require('../config/orm');
const logger = require('../core/logger');

async function loadModels() {
  const modelsPath = path.resolve(__dirname);
  const files = fs.readdirSync(modelsPath).filter(file => file !== 'index.js' && file.endsWith('.js'));
  
  const models = {};
  
  for (const file of files) {
    const modelPath = path.join(modelsPath, file);
    try {
      const model = require(modelPath);
      models[model.name || file.replace('.js', '')] = model;
      logger.debug(`Loaded ${activeORM} model: ${file}`);
    } catch (error) {
      logger.error(`Error loading model ${file}:`, error);
    }
  }
  
  return models;
}

module.exports = loadModels;