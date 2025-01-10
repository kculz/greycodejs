const fs = require('fs');
const path = require('path');
const { pluralize } = require('./utils');

const loadRoutes = (app, routesDir) => {
  try {
    const routeFiles = fs.readdirSync(routesDir);

    routeFiles.forEach((file) => {
      if (file.endsWith('.js')) {
        const routePath = path.join(routesDir, file);
        const route = require(routePath);

        // Validate and mount the router
        if (route && route.router) {
          const routeName = `/${pluralize(file.split('.')[0])}`;
          app.use(routeName, route.router);
        } else {
          console.error(`Invalid route file: ${file}. Ensure it exports { router }.`);
        }
      }
    });
  } catch (error) {
    console.error('Error loading routes:', error.message);
  }
};

module.exports = loadRoutes;
