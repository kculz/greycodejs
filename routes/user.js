const router = require('express').Router();
const { validate, validateId } = require('../middlewares/validate');
const userValidator = require('../validators/userValidator');

// Import controller
let UserController;
try {
  const controllerModule = require('../controllers/UserController');
  UserController = controllerModule.UserController || controllerModule;
} catch (error) {
  console.error('Error importing UserController:', error.message);
  UserController = {
    getAll: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    getById: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    create: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    update: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    remove: (req, res) => res.status(501).json({ error: 'Controller not implemented' })
  };
}

/**
 * User Routes with Validation
 * All routes are protected with validation middleware
 */

// Get all users with query validation
router.get(
  '/', 
  validate(userValidator.getUsersQuery, 'query'),
  UserController.getAll
);

// Get user by ID with ID validation
router.get(
  '/:id', 
  validateId('id'), 
  UserController.getById
);

// Create user with body validation
router.post(
  '/', 
  validate(userValidator.registerUser),
  UserController.create
);

// Update user with ID and body validation
router.put(
  '/:id', 
  validateId('id'),
  validate(userValidator.updateUser),
  UserController.update
);

// Delete user with ID validation
router.delete(
  '/:id', 
  validateId('id'),
  UserController.remove
);

module.exports = { router };