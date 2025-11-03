const express = require('express');
const path = require('path');
const applyMiddleware = require('./core/middleware');
const Router = require('./core/router');
const { port } = require('./config/app');
const loadRoutes = require('./core/routeLoader');
const logger = require('./utils/logger');
const { initializeDatabase, closeDatabase } = require('./core/database');
const initializeModels = require('./models');
const { activeORM } = require('./config/orm');

const app = express();

// Initialize logger
app.locals.logger = logger;
logger.info('Initializing GreyCodeJS application...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Active ORM: ${activeORM.toUpperCase()}`);

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

// Custom router for homepage
const router = new Router();
router.get('/', (req, res) => {
  logger.info('Homepage accessed');
  res.render('home', {
    title: 'GreyCodeJS - The Express.js Framework',
    devs: [
      { name: 'Kudzai Munyama', role: 'Lead Developer' },
    ],
  });
});

app.use(router.use());
logger.debug('Homepage router mounted');

// Load dynamic routes
const routesDir = path.resolve(__dirname, './routes');
try {
  loadRoutes(app, routesDir);
  logger.debug(`Routes loaded from ${routesDir}`);
} catch (err) {
  logger.error('Failed to load routes:', err);
}

// 404 handler (must be after all routes)
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

/**
 * Initialize database and start server
 */
async function startApplication() {
  let dbInstance = null;

  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    dbInstance = await initializeDatabase();
    logger.info('Database connection established successfully');
    
    // Initialize models based on active ORM
    let models = null;
    
    switch (activeORM) {
      case 'sequelize':
        models = initializeModels(dbInstance);
        logger.info('Sequelize models initialized successfully');
        
        // Sync models in development (optional - use migrations in production)
        if (process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true') {
          logger.warn('Syncing database schema (development only)...');
          await dbInstance.sync({ alter: false });
          logger.info('Database schema synchronized');
        }
        break;
        
      case 'mongoose':
        models = initializeModels(dbInstance);
        logger.info('Mongoose models initialized successfully');
        // Mongoose doesn't need sync - schemas are applied automatically
        break;
        
      case 'prisma':
        models = initializeModels(dbInstance);
        logger.info('Prisma models initialized successfully');
        // Prisma uses migrations via CLI
        break;
        
      default:
        throw new Error(`Unsupported ORM: ${activeORM}`);
    }
    
    // Make models and database available throughout the app
    app.locals.models = models;
    app.locals.db = dbInstance;
    global.models = models;
    
    // Start the HTTP server
    const server = app.listen(port, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 GreyCodeJS Server Started Successfully!`);
      logger.info(`📍 URL: http://localhost:${port}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 ORM: ${activeORM.toUpperCase()}`);
      logger.info('='.repeat(50));
    });

    // Store server instance for graceful shutdown
    app.locals.server = server;

  } catch (error) {
    logger.error('Failed to start application:', error);
    
    // Cleanup on failure
    if (dbInstance) {
      try {
        await closeDatabase(dbInstance);
      } catch (cleanupError) {
        logger.error('Error during cleanup:', cleanupError);
      }
    }
    
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  const server = app.locals.server;
  const db = app.locals.db;
  
  try {
    // Stop accepting new connections
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('HTTP server closed');
    }
    
    // Close database connection
    if (db) {
      await closeDatabase(db);
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the application
startApplication();

module.exports = app;