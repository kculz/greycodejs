const express = require('express');
const path = require('path');
const applyMiddleware = require('./core/middleware');
const Router = require('./core/router');
const sequelize = require('./core/database');
const asset = require('./core/assetHelper');
const { port } = require('./config/app');
const loadRoutes = require('./core/routeLoader');
const logger = require('./utils/logger'); // Import the logger

const app = express();

// Initialize logger
app.locals.logger = logger; // Make logger available throughout the app

// Log app startup
logger.info('Initializing Grey.js application...');

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
logger.debug('View engine configured: EJS');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
logger.debug('Static files served from /public');

// Apply middleware
try {
  applyMiddleware(app);
  logger.debug('Middleware applied successfully');
} catch (err) {
  logger.error('Failed to apply middleware:', err);
  process.exit(1);
}

// Load dynamic routes
const routesDir = path.resolve(__dirname, './routes');
try {
  loadRoutes(app, routesDir);
  logger.debug(`Routes loaded from ${routesDir}`);
} catch (err) {
  logger.error('Failed to load routes:', err);
}

// Custom router
const router = new Router();
router.get('/', (req, res) => {
  req.logger = logger; // Attach logger to request object
  logger.info('Homepage accessed');
  
  res.render('home', {
    title: 'Grey.js - The Express.js Framework',
    devs: [
      { name: 'Kudzai Munyama', role: 'Lead Developer' },
    ],
  });
});

app.use(router.use());
logger.debug('Custom router mounted');

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Database connection
sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established');
    
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Access the app: http://localhost:${port}`);
    });
  })
  .catch(err => {
    logger.error('Unable to connect to the database:', err);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});