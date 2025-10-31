const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('create-resource <name>')
    .description('Generate all resources (model, controller, route) for a given name')
    .action((name) => {
      const modelName = name.charAt(0).toUpperCase() + name.slice(1);
      const modelContent = `
module.exports = (sequelize, DataTypes) => {
const ${modelName} = sequelize.define('${modelName}', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Add your fields here
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

${modelName}.associate = (models) => {
  // Define associations here
};

return ${modelName};
};
`;

      const modelsPath = path.resolve(process.cwd(), 'models');
      const modelPath = path.join(modelsPath, `${modelName}.js`);
      if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
      }
      fs.writeFileSync(modelPath, modelContent.trim());
      console.log(chalk.green(`Model ${modelName} created at ${modelPath}`));

      const controllerName = `${modelName}Controller`;
      const controllerContent = `
const { ${modelName} } = require('../models');

// Create
const create = async (req, res) => {
try {
  const data = await ${modelName}.create(req.body);
  return res.json({
    success: true,
    data,
  });
} catch (error) {
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
  const data = await ${modelName}.findAll();
  return res.json({
    success: true,
    data,
  });
} catch (error) {
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
  const data = await ${modelName}.findByPk(id);
  if (!data) {
    return res.status(404).json({
      success: false,
      message: '${modelName} not found',
    });
  }
  return res.json({
    success: true,
    data,
  });
} catch (error) {
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
  const [updated] = await ${modelName}.update(req.body, {
    where: { id },
  });
  if (updated) {
    const updatedData = await ${modelName}.findByPk(id);
    return res.json({
      success: true,
      data: updatedData,
    });
  }
  return res.status(404).json({
    success: false,
    message: '${modelName} not found',
  });
} catch (error) {
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
  const deleted = await ${modelName}.destroy({
    where: { id },
  });
  if (deleted) {
    return res.json({
      success: true,
      message: '${modelName} deleted',
    });
  }
  return res.status(404).json({
    success: false,
    message: '${modelName} not found',
  });
} catch (error) {
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
`;

      const controllersPath = path.resolve(process.cwd(), 'controllers');
      const controllerPath = path.join(controllersPath, `${controllerName}.js`);
      if (!fs.existsSync(controllersPath)) {
        fs.mkdirSync(controllersPath, { recursive: true });
      }
      fs.writeFileSync(controllerPath, controllerContent.trim());
      console.log(chalk.green(`Controller ${controllerName} created at ${controllerPath}`));

      const routeContent = `
const router = require('express').Router();
const ${controllerName} = require('../controllers/${controllerName}');

// ${modelName} routes
router.get('/', ${controllerName}.getAll);
router.get('/:id', ${controllerName}.getById);
router.post('/', ${controllerName}.create);
router.put('/:id', ${controllerName}.update);
router.delete('/:id', ${controllerName}.remove);

module.exports = router;
`;

      const routesPath = path.resolve(process.cwd(), 'routes');
      const routePath = path.join(routesPath, `${name.toLowerCase()}.js`);
      if (!fs.existsSync(routesPath)) {
        fs.mkdirSync(routesPath, { recursive: true });
      }
      fs.writeFileSync(routePath, routeContent.trim());
      console.log(chalk.green(`Route for ${modelName} created at ${routePath}`));

      console.log(chalk.bold.green(`\nAll resources for ${modelName} created successfully!`));
      console.log(chalk.blue(`\nNext steps:`));
      console.log(chalk.blue(`1. Add the route to your app.js or main router file:`));
      console.log(chalk.gray(`   const ${name.toLowerCase()}Router = require('./routes/${name.toLowerCase()}');`));
      console.log(chalk.gray(`   app.use('/api/${name.toLowerCase()}s', ${name.toLowerCase()}Router);`));
      console.log(chalk.blue(`2. Run 'greycodejs migrate' to create the database table`));
    });
};