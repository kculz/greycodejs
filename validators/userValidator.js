// validators/userValidator.js
const { Joi, commonSchemas } = require('../middlewares/validate');

/**
 * User Validation Schemas
 * Centralized validation rules for User-related operations
 */

// User registration validation
const registerUser = Joi.object({
  username: commonSchemas.username.required(),
  email: commonSchemas.email.required(),
  password: commonSchemas.password.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords must match'
    })
}).options({ stripUnknown: true });

// User login validation
const loginUser = Joi.object({
  email: commonSchemas.email.required(),
  password: Joi.string().required()
}).options({ stripUnknown: true });

// Update user profile validation
const updateUser = Joi.object({
  username: commonSchemas.username,
  email: commonSchemas.email,
  // Don't allow password updates through this endpoint
}).min(1).options({ stripUnknown: true }); // At least one field required

// Change password validation
const changePassword = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: commonSchemas.password.required(),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords must match'
    })
}).options({ stripUnknown: true });

// Forgot password validation
const forgotPassword = Joi.object({
  email: commonSchemas.email.required()
}).options({ stripUnknown: true });

// Reset password validation
const resetPassword = Joi.object({
  token: Joi.string().required(),
  newPassword: commonSchemas.password.required(),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords must match'
    })
}).options({ stripUnknown: true });

// User query parameters validation
const getUsersQuery = Joi.object({
  page: commonSchemas.pagination.page,
  limit: commonSchemas.pagination.limit,
  sortBy: Joi.string().valid('username', 'email', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: commonSchemas.pagination.sortOrder,
  search: Joi.string().max(100).trim(),
  status: Joi.string().valid('active', 'inactive', 'suspended')
}).options({ stripUnknown: true });

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
  getUsersQuery
};