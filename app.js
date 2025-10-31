const express = require('express');
const path = require('path');
const applyMiddleware = require('./core/middleware');
const Router = require('./core/router');
const asset = require('./core/assetHelper');
const { port } = require('./config/app');
const loadRoutes = require('./core/routeLoader');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./core/database');
const initializeModels = require('./models'); // Import model initializer

const app = express();

// Initialize logger
app.locals.logger = logger;
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

// Custom router
const router = new Router();
router.get('/', (req, res) => {
  req.logger = logger;
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

// Load dynamic routes
const routesDir = path.resolve(__dirname, './routes');
try {
  loadRoutes(app, routesDir);
  logger.debug(`Routes loaded from ${routesDir}`);
} catch (err) {
  logger.error('Failed to load routes:', err);
}

// Error handling middleware (must be after routes)
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

// Database connection and server startup
(async () => {
  try {
    // Initialize the database connection
    const sequelize = await initializeDatabase();
    logger.info('Database connection established');
    
    // Initialize all models
    const models = initializeModels(sequelize);
    logger.info('Models initialized successfully');
    
    // Make database and models available throughout the app
    app.locals.db = sequelize;
    app.locals.models = models;
    
    // Also make models available globally for controllers
    // This allows: const { User } = require('../models')
    global.models = models;
    
    // Sync models with database (use { alter: true } in development, avoid in production)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('Database synchronized');
    }
    
    // Start the server
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Access the app: http://localhost:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Unable to start application:', err);
    process.exit(1);
  }
})();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    if (app.locals.db) {
      await app.locals.db.close();
      logger.info('Database connection closed');
    }
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;