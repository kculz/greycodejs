// core/middleware.js
const express = require('express');
const { applySecurityMiddleware } = require('../middlewares/security');
const logger = require('../utils/logger');

/**
 * Apply all application middleware
 * @param {Express} app - Express application instance
 */
const applyMiddleware = (app) => {
  try {
    logger.info('Initializing middleware stack...');

    // 1. Security middleware (should be first)
    applySecurityMiddleware(app);

    // 2. Body parsing middleware
    app.use(express.json({ 
      limit: process.env.JSON_LIMIT || '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhooks/signatures if needed
        req.rawBody = buf.toString();
      }
    }));
    
    app.use(express.urlencoded({ 
      extended: true,
      limit: process.env.URL_ENCODED_LIMIT || '10mb'
    }));
    
    logger.debug('Body parsing middleware configured');

    // 3. Request ID middleware (for tracking requests)
    app.use((req, res, next) => {
      req.id = require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.id);
      next();
    });
    logger.debug('Request ID middleware configured');

    // 4. Response time tracking
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          logger.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
      });
      next();
    });
    logger.debug('Response time tracking configured');

    logger.info('✅ All middleware initialized successfully');
  } catch (error) {
    logger.error('Failed to apply middleware:', error);
    throw error;
  }
};

module.exports = applyMiddleware;