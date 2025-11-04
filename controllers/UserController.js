const { User } = require('../models/models');

/**
 * UserController
 * Handles CRUD operations for User
 */

// Create new User
const create = async (req, res) => {
  try {
    const data = await User.create(req.body);
    
    return res.status(201).json({
      success: true,
      data,
      message: 'User created successfully'
    });
  } catch (error) {
    req.logger?.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get all Users
const getAll = async (req, res) => {
  try {
    const data = await User.findAll();
    
    return res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    req.logger?.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get User by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    req.logger?.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Update User
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await data.update(req.body);
    
    return res.json({
      success: true,
      data,
      message: 'User updated successfully'
    });
  } catch (error) {
    req.logger?.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Delete User
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await data.destroy();
    
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    req.logger?.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};