const { User } = require('../models/models');

// Create
const create = async (req, res) => {
  try {
    const user = await User.create(req.body);
    return res.status(201).json({
      success: true,
      data: user,
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

// Get All
const getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // Don't send passwords
    });

    // Check if request wants JSON response
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        data: users,
        count: users.length
      });
    }

    // Otherwise render view
    return res.render('users', {
      title: 'User List',
      users,
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

// Get By ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: user
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

// Update
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow password updates through this endpoint
    const { password, ...updateData } = req.body;

    await user.update(updateData);

    return res.json({
      success: true,
      data: user,
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

// Delete
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.destroy();

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