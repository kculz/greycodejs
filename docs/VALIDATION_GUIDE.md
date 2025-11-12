# GreyCodeJS Validation Guide

## 📚 Table of Contents
1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Common Schemas](#common-schemas)
4. [Creating Validators](#creating-validators)
5. [Advanced Patterns](#advanced-patterns)
6. [Error Handling](#error-handling)

---

## Installation

```bash
npm install joi
```

## Basic Usage

### 1. Simple Body Validation

```javascript
const router = require('express').Router();
const { validate, Joi } = require('../middlewares/validate');

// Define schema
const createProductSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().positive().required(),
  description: Joi.string().max(500)
});

// Apply to route
router.post('/products', validate(createProductSchema), (req, res) => {
  // req.body is now validated and sanitized
  res.json({ success: true, data: req.body });
});
```

### 2. Query Parameters Validation

```javascript
const { validate, Joi } = require('../middlewares/validate');

const searchSchema = Joi.object({
  q: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

router.get('/search', validate(searchSchema, 'query'), (req, res) => {
  // req.query is validated
  const { q, page, limit } = req.query;
  res.json({ query: q, page, limit });
});
```

### 3. URL Parameters Validation

```javascript
const { validateId } = require('../middlewares/validate');

// Validates that :id is a valid UUID
router.get('/users/:id', validateId('id'), (req, res) => {
  res.json({ id: req.params.id });
});

// For MongoDB ObjectId
router.get('/posts/:id', validateId('id', 'objectId'), (req, res) => {
  res.json({ id: req.params.id });
});
```

### 4. Multiple Sources Validation

```javascript
const { validateMultiple, Joi } = require('../middlewares/validate');

const schemas = {
  params: Joi.object({
    userId: Joi.string().uuid().required()
  }),
  body: Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required()
  }),
  query: Joi.object({
    publish: Joi.boolean().default(false)
  })
};

router.post('/users/:userId/posts', validateMultiple(schemas), (req, res) => {
  // req.params, req.body, and req.query are all validated
  res.json({
    userId: req.params.userId,
    post: req.body,
    publish: req.query.publish
  });
});
```

---

## Common Schemas

The validation middleware provides reusable schemas:

```javascript
const { commonSchemas } = require('../middlewares/validate');

// UUID
commonSchemas.uuid

// Email (lowercase, trimmed)
commonSchemas.email

// Password (min 8, letters + numbers)
commonSchemas.password

// Strong password (letters + numbers + special chars)
commonSchemas.strongPassword

// Phone number (international format)
commonSchemas.phone

// URL
commonSchemas.url

// Date (ISO format)
commonSchemas.date

// Name (2-100 chars)
commonSchemas.name

// Username (alphanumeric, 3-30 chars)
commonSchemas.username

// Description (max 1000 chars)
commonSchemas.description

// Pagination
commonSchemas.pagination // { page, limit, sortBy, sortOrder }

// MongoDB ObjectId
commonSchemas.objectId

// Boolean from string (for query params)
commonSchemas.booleanString
```

### Using Common Schemas

```javascript
const { Joi, commonSchemas } = require('../middlewares/validate');

const userSchema = Joi.object({
  username: commonSchemas.username.required(),
  email: commonSchemas.email.required(),
  password: commonSchemas.strongPassword.required(),
  phone: commonSchemas.phone,
  website: commonSchemas.url
});
```

---

## Creating Validators

### Using CLI

```bash
# Create basic validator
npm run cli -- create-validator Product

# Create CRUD validator with common operations
npm run cli -- create-validator Product --crud
```

### Manual Creation

Create `validators/productValidator.js`:

```javascript
const { Joi, commonSchemas } = require('../middlewares/validate');

const createProduct = Joi.object({
  name: commonSchemas.name.required(),
  price: Joi.number().positive().required(),
  category: Joi.string().valid('electronics', 'clothing', 'food').required(),
  description: commonSchemas.description,
  inStock: Joi.boolean().default(true),
  tags: Joi.array().items(Joi.string()).max(10)
});

const updateProduct = Joi.object({
  name: commonSchemas.name,
  price: Joi.number().positive(),
  category: Joi.string().valid('electronics', 'clothing', 'food'),
  description: commonSchemas.description,
  inStock: Joi.boolean()
}).min(1); // At least one field required

const getProductsQuery = Joi.object({
  ...commonSchemas.pagination,
  category: Joi.string().valid('electronics', 'clothing', 'food'),
  minPrice: Joi.number().positive(),
  maxPrice: Joi.number().positive().greater(Joi.ref('minPrice')),
  inStock: commonSchemas.booleanString
});

module.exports = {
  createProduct,
  updateProduct,
  getProductsQuery
};
```

### Using in Routes

```javascript
const router = require('express').Router();
const { validate, validateId } = require('../middlewares/validate');
const productValidator = require('../validators/productValidator');
const ProductController = require('../controllers/ProductController');

router.get('/', 
  validate(productValidator.getProductsQuery, 'query'),
  ProductController.getAll
);

router.post('/', 
  validate(productValidator.createProduct),
  ProductController.create
);

router.put('/:id', 
  validateId('id'),
  validate(productValidator.updateProduct),
  ProductController.update
);
```

---

## Advanced Patterns

### 1. Conditional Validation

```javascript
const schema = Joi.object({
  type: Joi.string().valid('individual', 'company').required(),
  
  // Only required if type is 'individual'
  firstName: Joi.when('type', {
    is: 'individual',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  
  lastName: Joi.when('type', {
    is: 'individual',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  
  // Only required if type is 'company'
  companyName: Joi.when('type', {
    is: 'company',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  })
});
```

### 2. Custom Validation

```javascript
const schema = Joi.object({
  age: Joi.number().integer().custom((value, helpers) => {
    if (value < 18) {
      return helpers.error('any.invalid', { message: 'Must be 18 or older' });
    }
    return value;
  }),
  
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required()
});
```

### 3. Dependent Fields

```javascript
const schema = Joi.object({
  subscribe: Joi.boolean().required(),
  
  // Email is required only if subscribe is true
  email: Joi.alternatives().conditional('subscribe', {
    is: true,
    then: commonSchemas.email.required(),
    otherwise: Joi.forbidden()
  })
});
```

### 4. Array Validation

```javascript
const schema = Joi.object({
  // Simple array
  tags: Joi.array().items(Joi.string()).min(1).max(10),
  
  // Array of objects
  addresses: Joi.array().items(
    Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      zipCode: Joi.string().pattern(/^\d{5}$/).required(),
      isPrimary: Joi.boolean().default(false)
    })
  ).min(1).max(5)
});
```

### 5. Nested Objects

```javascript
const schema = Joi.object({
  user: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      avatar: commonSchemas.url
    }),
    settings: Joi.object({
      newsletter: Joi.boolean().default(false),
      notifications: Joi.boolean().default(true)
    })
  }).required()
});
```

### 6. File Upload Validation

```javascript
const validateFileUpload = (req, res, next) => {
  const schema = Joi.object({
    mimetype: Joi.string()
      .valid('image/jpeg', 'image/png', 'image/gif')
      .required(),
    size: Joi.number()
      .max(5 * 1024 * 1024) // 5MB
      .required()
  });

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const { error } = schema.validate(req.file);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file',
      errors: error.details
    });
  }

  next();
};
```

---

## Error Handling

### Validation Error Response Format

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email",
      "type": "string.email"
    },
    {
      "field": "password",
      "message": "Password must contain at least one letter and one number",
      "type": "string.pattern.base"
    }
  ]
}
```

### Custom Error Messages

```javascript
const schema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Please provide a username'
    }),
  
  email: commonSchemas.email.required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});
```

### Global Error Handler Integration

In your error handler middleware:

```javascript
// middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  // Other errors...
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message
  });
};
```

---

## Testing Validation

```javascript
// tests/validation/user.test.js
const { validate } = require('../../middlewares/validate');
const userValidator = require('../../validators/userValidator');

describe('User Validation', () => {
  test('should accept valid user data', () => {
    const validData = {
      username: 'johndoe',
      email: 'john@example.com',
      password: 'Password123',
      confirmPassword: 'Password123'
    };
    
    const { error } = userValidator.registerUser.validate(validData);
    expect(error).toBeUndefined();
  });
  
  test('should reject invalid email', () => {
    const invalidData = {
      username: 'johndoe',
      email: 'invalid-email',
      password: 'Password123',
      confirmPassword: 'Password123'
    };
    
    const { error } = userValidator.registerUser.validate(invalidData);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('email');
  });
});
```

---

## Best Practices

1. **Create separate validator files** for each model/resource
2. **Use common schemas** to maintain consistency
3. **Always validate user input** - never trust client data
4. **Use `stripUnknown: true`** to remove unexpected fields
5. **Provide clear error messages** for better UX
6. **Validate at route level**, not in controllers
7. **Test your validation schemas** thoroughly
8. **Document validation rules** in your API docs

---

## Quick Reference

```javascript
// Import
const { validate, validateId, Joi, commonSchemas } = require('../middlewares/validate');

// Basic validation
router.post('/', validate(schema), controller.create);

// Query validation
router.get('/', validate(schema, 'query'), controller.getAll);

// ID validation
router.get('/:id', validateId('id'), controller.getById);

// Multiple sources
router.post('/:id', validateMultiple({ params: paramsSchema, body: bodySchema }), controller.update);

// Custom schema
const mySchema = Joi.object({
  name: commonSchemas.name.required(),
  email: commonSchemas.email.required()
});
```

---

For more information on Joi validation, visit: https://joi.dev/api/