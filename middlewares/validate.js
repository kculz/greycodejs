// middlewares/validate.js
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation Middleware Factory
 * Creates middleware that validates request data against a Joi schema
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Where to validate ('body', 'query', 'params', 'headers')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // Get the data to validate based on source
    const dataToValidate = req[source];

    if (!dataToValidate) {
      logger.warn(`Validation attempted on undefined req.${source}`);
      return res.status(400).json({
        success: false,
        message: `No ${source} data provided for validation`
      });
    }

    // Validate the data
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      // Format validation errors
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logger.warn('Validation failed:', {
        source,
        errors,
        path: req.path,
        method: req.method
      });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    
    next();
  };
};

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object with keys: body, query, params, headers
 * @returns {Function} Express middleware function
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each source
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema || !req[source]) continue;

      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        })));
      } else {
        // Update with validated data
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      logger.warn('Multi-source validation failed:', {
        errors,
        path: req.path,
        method: req.method
      });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    next();
  };
};

/**
 * Common validation schemas for reuse
 */
const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  
  // Email validation
  email: Joi.string().email().lowercase().trim(),
  
  // Password validation (min 8 chars, at least one letter and one number)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
    .message('Password must contain at least one letter and one number'),
  
  // Strong password (includes special characters)
  strongPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/)
    .message('Password must contain at least one letter, one number, and one special character'),
  
  // Phone number (international format)
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .message('Invalid phone number format'),
  
  // URL validation
  url: Joi.string().uri(),
  
  // Date validation
  date: Joi.date().iso(),
  
  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  },
  
  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  
  // Common text fields
  name: Joi.string().min(2).max(100).trim(),
  username: Joi.string().alphanum().min(3).max(30).lowercase().trim(),
  description: Joi.string().max(1000).trim().allow(''),
  
  // Boolean from string (for query params)
  booleanString: Joi.string().valid('true', 'false', '1', '0').custom((value) => {
    return value === 'true' || value === '1';
  })
};

/**
 * Helper to create ID parameter validation
 */
const validateId = (paramName = 'id', type = 'uuid') => {
  const schema = type === 'uuid' 
    ? Joi.object({ [paramName]: commonSchemas.uuid.required() })
    : Joi.object({ [paramName]: commonSchemas.objectId.required() });
  
  return validate(schema, 'params');
};

/**
 * Helper to validate pagination query params
 */
const validatePagination = () => {
  return validate(Joi.object(commonSchemas.pagination), 'query');
};

/**
 * Sanitization helpers
 */
const sanitize = {
  /**
   * Remove all HTML tags from string fields
   */
  stripHtml: (data) => {
    if (typeof data === 'string') {
      return data.replace(/<[^>]*>/g, '');
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitize.stripHtml(value);
      }
      return sanitized;
    }
    return data;
  },
  
  /**
   * Trim all string fields
   */
  trimStrings: (data) => {
    if (typeof data === 'string') {
      return data.trim();
    }
    if (typeof data === 'object' && data !== null) {
      const trimmed = {};
      for (const [key, value] of Object.entries(data)) {
        trimmed[key] = sanitize.trimStrings(value);
      }
      return trimmed;
    }
    return data;
  }
};

module.exports = {
  validate,
  validateMultiple,
  validateId,
  validatePagination,
  commonSchemas,
  sanitize,
  Joi // Export Joi for custom schemas
};