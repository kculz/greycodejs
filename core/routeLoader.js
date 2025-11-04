const fs = require('fs');
const path = require('path');
const { pluralize } = require('./utils');
const logger = require('../utils/logger');

const loadRoutes = (app, routesDir) => {
  try {
    // Check if routes directory exists
    if (!fs.existsSync(routesDir)) {
      logger.warn(`Routes directory does not exist: ${routesDir}`);
      return;
    }

    const routeFiles = fs.readdirSync(routesDir);

    if (routeFiles.length === 0) {
      logger.info('No route files found');
      return;
    }

    let loadedCount = 0;

    routeFiles.forEach((file) => {
      if (file.endsWith('.js')) {
        try {
          const routePath = path.join(routesDir, file);
          
          // Clear require cache to allow hot reloading
          delete require.cache[require.resolve(routePath)];
          
          const route = require(routePath);

          // Validate and mount the router
          if (route && route.router) {
            const routeName = `/${pluralize(file.split('.')[0])}`;
            app.use(routeName, route.router);
            logger.debug(`Loaded route: ${routeName} from ${file}`);
            loadedCount++;
          } else {
            logger.warn(`Invalid route file: ${file}. Ensure it exports { router }.`);
          }
        } catch (error) {
          // Don't crash if a single route fails to load
          logger.error(`Error loading route ${file}:`, error.message);
        }
      }
    });

    if (loadedCount > 0) {
      logger.info(`Successfully loaded ${loadedCount} route file(s)`);
    }
  } catch (error) {
    logger.error('Error loading routes:', error.message);
    // Don't throw - just log the error
  }
};

module.exports = loadRoutes;