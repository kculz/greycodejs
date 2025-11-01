// models/models.js
/**
 * Helper file to export models for use in controllers
 * Usage in controllers: const { User, Post } = require('../models/models');
 * 
 * This file provides access to initialized models from the global object
 * that was set up during application startup in app.js
 */

// Proxy handler to access models from global object
const modelsProxy = new Proxy({}, {
  get(target, prop) {
    // Check if models have been initialized
    if (!global.models) {
      throw new Error(
        'Models not initialized. Make sure the application has started and models are loaded.'
      );
    }
    
    // Return the requested model
    if (prop in global.models) {
      return global.models[prop];
    }
    
    // If model doesn't exist, provide helpful error
    const availableModels = Object.keys(global.models)
      .filter(key => key !== 'sequelize' && key !== 'Sequelize')
      .join(', ');
    
    throw new Error(
      `Model "${prop}" not found. Available models: ${availableModels || 'none'}`
    );
  }
});

module.exports = modelsProxy;