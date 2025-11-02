const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Register create-controller command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('create-controller <name>')
    .description('Create a new controller with basic CRUD operations')
    .option('--no-crud', 'Create controller without CRUD methods')
    .action((name, options) => {
      const controllersDir = path.join(process.cwd(), 'controllers');
      const controllerName = `${name.charAt(0).toUpperCase() + name.slice(1)}Controller`;
      const filePath = path.join(controllersDir, `${controllerName}.js`);

      // Ensure controllers directory exists
      if (!fs.existsSync(controllersDir)) {
        fs.mkdirSync(controllersDir, { recursive: true });
      }

      // Check if controller already exists
      if (fs.existsSync(filePath)) {
        console.error(chalk.red(`Controller "${controllerName}" already exists at ${filePath}`));
        process.exit(1);
      }

      // Generate content based on options
      const modelName = name.charAt(0).toUpperCase() + name.slice(1);
      
      let content;
      if (options.crud !== false) {
        // With CRUD operations
        content = `const { ${modelName} } = require('../models/models');

/**
 * ${controllerName}
 * Handles CRUD operations for ${modelName}
 */

// Create new ${modelName}
const create = async (req, res) => {
  try {
    const data = await ${modelName}.create(req.body);
    
    return res.status(201).json({
      success: true,
      data,
      message: '${modelName} created successfully'
    });
  } catch (error) {
    req.logger?.error('Error creating ${modelName.toLowerCase()}:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get all ${modelName}s
const getAll = async (req, res) => {
  try {
    const data = await ${modelName}.findAll();
    
    return res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    req.logger?.error('Error fetching ${modelName.toLowerCase()}s:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get ${modelName} by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await ${modelName}.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '${modelName} not found'
      });
    }
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    req.logger?.error('Error fetching ${modelName.toLowerCase()}:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Update ${modelName}
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await ${modelName}.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '${modelName} not found'
      });
    }
    
    await data.update(req.body);
    
    return res.json({
      success: true,
      data,
      message: '${modelName} updated successfully'
    });
  } catch (error) {
    req.logger?.error('Error updating ${modelName.toLowerCase()}:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Delete ${modelName}
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await ${modelName}.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '${modelName} not found'
      });
    }
    
    await data.destroy();
    
    return res.json({
      success: true,
      message: '${modelName} deleted successfully'
    });
  } catch (error) {
    req.logger?.error('Error deleting ${modelName.toLowerCase()}:', error);
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
};`;
      } else {
        // Without CRUD operations
        content = `/**
 * ${controllerName}
 * Add your controller methods here
 */

// Example method
const index = async (req, res) => {
  try {
    // Your logic here
    return res.json({
      success: true,
      message: 'Controller is working!'
    });
  } catch (error) {
    req.logger?.error('Error in ${controllerName}:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  index,
};`;
      }

      // Write the controller file
      fs.writeFileSync(filePath, content);
      
      console.log(chalk.green(`\n✅ Controller "${controllerName}" created successfully!`));
      console.log(chalk.gray(`   Location: ${filePath}`));
      
      if (options.crud !== false) {
        console.log(chalk.blue('\n📝 Next steps:'));
        console.log(chalk.gray(`   1. Create the ${modelName} model if it doesn't exist`));
        console.log(chalk.gray(`   2. Create routes: npm run cli -- create-route ${name.toLowerCase()}`));
        console.log(chalk.gray(`   3. Register the routes in your app`));
      }
    });
};