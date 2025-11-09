// middlewares/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const logger = require('../utils/logger');

/**
 * Security Middleware Configuration
 * Implements multiple layers of security for the application
 */

/**
 * CORS Configuration
 * Controls which domains can access the API
 */
const configureCORS = () => {
  const corsOptions = {
    // Allow specific origins or use environment variable
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000'];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 hours
  };

  return cors(corsOptions);
};

/**
 * Helmet Configuration
 * Sets various HTTP headers for security
 */
const configureHelmet = () => {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: true,
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: { policy: 'same-origin' },
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    // Expect-CT
    expectCt: { maxAge: 86400 },
    // Frameguard
    frameguard: { action: 'deny' },
    // Hide Powered-By header
    hidePoweredBy: true,
    // HSTS (HTTP Strict Transport Security)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    // IE No Open
    ieNoOpen: true,
    // Don't Sniff Mimetype
    noSniff: true,
    // Origin Agent Cluster
    originAgentCluster: true,
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Referrer Policy
    referrerPolicy: { policy: 'no-referrer' },
    // X-Content-Type-Options
    xContentTypeOptions: true,
    // XSS Filter
    xssFilter: true
  });
};

/**
 * Rate Limiting Configuration
 * Prevents brute force and DDoS attacks
 */
const configureRateLimiting = () => {
  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
      });
    }
  });

  // Stricter rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    },
    handler: (req, res) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: 900
      });
    }
  });

  // Password reset rate limiter
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: {
      success: false,
      message: 'Too many password reset requests, please try again later.',
      retryAfter: 3600
    }
  });

  return {
    apiLimiter,
    authLimiter,
    passwordResetLimiter
  };
};

/**
 * Input Sanitization
 * Prevents NoSQL injection and XSS attacks
 */
const configureSanitization = () => {
  return [
    // Sanitize data against NoSQL injection
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logger.warn(`Potential NoSQL injection attempt detected from ${req.ip} in key: ${key}`);
      }
    }),
    
    // Sanitize data against XSS
    xss(),
    
    // Prevent HTTP Parameter Pollution
    hpp({
      whitelist: [
        // Add parameters that are allowed to be arrays
        'sort',
        'fields',
        'filter'
      ]
    })
  ];
};

/**
 * Security Headers Middleware
 * Additional custom security headers
 */
const securityHeaders = (req, res, next) => {
  // Remove sensitive information from errors
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  
  next();
};

/**
 * Request Logger for Security Events
 */
const securityLogger = (req, res, next) => {
  // Log potentially suspicious requests
  const suspiciousPatterns = [
    /(\.\.|\/etc\/passwd|\/etc\/shadow)/i, // Path traversal
    /(union|select|insert|update|delete|drop|create|alter|exec|script)/i, // SQL injection
    /(<script|javascript:|onerror=|onload=)/i, // XSS
    /(\${|{{|<%=)/i // Template injection
  ];

  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Check for suspicious patterns
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(fullUrl) || pattern.test(requestData)
  );

  if (isSuspicious) {
    logger.warn('Suspicious request detected:', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      body: req.body
    });
  }

  next();
};

/**
 * IP Whitelist/Blacklist Middleware (Optional)
 */
const ipFilter = (req, res, next) => {
  const blacklist = process.env.IP_BLACKLIST 
    ? process.env.IP_BLACKLIST.split(',').map(ip => ip.trim())
    : [];
  
  const whitelist = process.env.IP_WHITELIST
    ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim())
    : [];

  const clientIp = req.ip || req.connection.remoteAddress;

  // If whitelist exists, only allow whitelisted IPs
  if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
    logger.warn(`Access denied for non-whitelisted IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Block blacklisted IPs
  if (blacklist.includes(clientIp)) {
    logger.warn(`Access denied for blacklisted IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  next();
};

/**
 * Apply all security middleware
 */
const applySecurityMiddleware = (app) => {
  logger.info('Applying security middleware...');

  // Trust proxy (important for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Apply CORS
  app.use(configureCORS());
  logger.debug('CORS configured');

  // Apply Helmet security headers
  app.use(configureHelmet());
  logger.debug('Helmet security headers applied');

  // Apply custom security headers
  app.use(securityHeaders);
  logger.debug('Custom security headers applied');

  // Apply input sanitization
  const sanitizers = configureSanitization();
  sanitizers.forEach(sanitizer => app.use(sanitizer));
  logger.debug('Input sanitization applied');

  // Apply security logger
  app.use(securityLogger);
  logger.debug('Security logger applied');

  // Apply IP filter (if configured)
  if (process.env.IP_WHITELIST || process.env.IP_BLACKLIST) {
    app.use(ipFilter);
    logger.debug('IP filtering applied');
  }

  // Note: Rate limiting should be applied to specific routes
  // Export the rate limiters for use in routes

  logger.info('✅ Security middleware applied successfully');
};

module.exports = {
  applySecurityMiddleware,
  configureCORS,
  configureHelmet,
  configureRateLimiting,
  configureSanitization,
  securityHeaders,
  securityLogger,
  ipFilter
};