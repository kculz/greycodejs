// models/prisma-loader.js
const logger = require('../utils/logger');

/**
 * Initialize and load Prisma client
 * @param {PrismaClient} prismaInstance - Prisma client instance
 * @returns {object} Object containing Prisma client and models
 */
function initializePrismaModels(prismaInstance) {
  try {
    logger.info('Initializing Prisma models...');

    // Prisma doesn't use separate model files like Sequelize/Mongoose
    // The models are defined in prisma/schema.prisma and accessed via the client
    
    // Create a models object that provides easy access to Prisma models
    const models = {
      // The Prisma client itself provides access to all models
      // Example: prismaInstance.user, prismaInstance.post, etc.
      prisma: prismaInstance,
      
      // Helper method to get all available models
      getModels: () => {
        const modelNames = [];
        // Get all model names from Prisma client
        for (const key in prismaInstance) {
          if (
            typeof prismaInstance[key] === 'object' &&
            prismaInstance[key] !== null &&
            !key.startsWith('$') &&
            !key.startsWith('_') &&
            key !== 'prisma'
          ) {
            modelNames.push(key);
          }
        }
        return modelNames;
      },
      
      // Helper method to check if a model exists
      hasModel: (modelName) => {
        const lowerModelName = modelName.toLowerCase();
        return lowerModelName in prismaInstance;
      },
      
      // Helper method to get a specific model
      getModel: (modelName) => {
        const lowerModelName = modelName.toLowerCase();
        if (lowerModelName in prismaInstance) {
          return prismaInstance[lowerModelName];
        }
        throw new Error(`Model "${modelName}" not found in Prisma schema`);
      }
    };

    // Dynamically add all Prisma models to the models object
    // This allows accessing models like: models.User, models.Post, etc.
    for (const key in prismaInstance) {
      if (
        typeof prismaInstance[key] === 'object' &&
        prismaInstance[key] !== null &&
        !key.startsWith('$') &&
        !key.startsWith('_')
      ) {
        // Capitalize first letter for consistency with Sequelize/Mongoose
        const modelName = key.charAt(0).toUpperCase() + key.slice(1);
        models[modelName] = prismaInstance[key];
        logger.debug(`Loaded Prisma model: ${modelName}`);
      }
    }

    const modelCount = models.getModels().length;
    logger.info(`Successfully loaded ${modelCount} Prisma model(s)`);
    
    if (modelCount === 0) {
      logger.warn('No Prisma models found. Make sure:');
      logger.warn('1. You have defined models in prisma/schema.prisma');
      logger.warn('2. You have run: npx prisma generate');
      logger.warn('3. Your Prisma client is up to date');
    }

    return models;
  } catch (error) {
    logger.error('Failed to initialize Prisma models:', error);
    throw error;
  }
}

module.exports = initializePrismaModels;