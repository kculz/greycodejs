const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('create-controller <name>')
    .description('Create a new controller with basic CRUD operations')
    .action((name) => {
      const controllersDir = path.join(process.cwd(), 'controllers');
      const controllerName = `${name.charAt(0).toUpperCase() + name.slice(1)}Controller`;
      const filePath = path.join(controllersDir, `${controllerName}.js`);

      if (!fs.existsSync(controllersDir)) {
        fs.mkdirSync(controllersDir, { recursive: true });
      }

      const content = `
const { ${name.charAt(0).toUpperCase() + name.slice(1)} } = require('../models');

// Create
const create = async (req, res) => {
  try {
    // Logic for creating a ${name}
  } catch (error) {
    return res.json({
      success: false,
      msg: error.message,
      error: 'Internal server error!',
    });
  }
};

// Get All
const getAll = async (req, res) => {
  try {
    // Logic for retrieving all ${name}s
  } catch (error) {
    return res.json({
      success: false,
      msg: error.message,
      error: 'Internal server error!',
    });
  }
};

// Get By ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    // Logic for retrieving a ${name} by ID
  } catch (error) {
    return res.json({
      success: false,
      msg: error.message,
      error: 'Internal server error!',
    });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { id } = req.params;
    // Logic for updating a ${name}
  } catch (error) {
    return res.json({
      success: false,
      msg: error.message,
      error: 'Internal server error!',
    });
  }
};

// Delete
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    // Logic for deleting a ${name}
  } catch (error) {
    return res.json({
      success: false,
      msg: error.message,
      error: 'Internal server error!',
    });
  }
};

module.exports.${controllerName} = {
  create,
  getAll,
  getById,
  update,
  remove,
};
`.trim();

      if (fs.existsSync(filePath)) {
        console.error(chalk.red(`Controller "${controllerName}" already exists.`));
        return;
      }

      fs.writeFileSync(filePath, content);
      console.log(chalk.green(`Controller "${controllerName}" created at ${filePath}`));
    });
};