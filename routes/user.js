const router = require('express').Router();

// Import controller - handle both export patterns
let UserController;
try {
  // Try destructured import first
  const controllerModule = require('../controllers/UserController');
  UserController = controllerModule.UserController || controllerModule;
} catch (error) {
  console.error('Error importing UserController:', error.message);
  // Fallback: create empty controller
  UserController = {
    getAll: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    getById: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    create: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    update: (req, res) => res.status(501).json({ error: 'Controller not implemented' }),
    remove: (req, res) => res.status(501).json({ error: 'Controller not implemented' })
  };
}

// Define routes for User
router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.remove);

// Export router
module.exports = { router };