
const router = require('express').Router();
const { UserController } = require('../controllers/UserController');

// Define routes for User
router.get('/', UserController.getAll);


module.exports = {router};
