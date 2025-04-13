#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { faker } = require('@faker-js/faker');
const chalk = require('chalk');

const program = new Command();

program
  .name('greycodejs')
  .description('Greycodejs CLI')
  .version('0.0.1');

// Add the create-model command
program
  .command('create-model <name>')
  .description('Generate a new Sequelize model')
  .action((name) => {
    // Convert model name to PascalCase
    const modelName = name.charAt(0).toUpperCase() + name.slice(1);

    // Define the file content
    const content = `
module.exports = (sequelize, DataTypes) => {
  const ${modelName} = sequelize.define('${modelName}', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    exampleField: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  ${modelName}.associate = (models) => {
    // Define associations here
    // Example: ${modelName}.hasMany(models.OtherModel);
  };

  return ${modelName};
};
`;

    // Define the target path
    const modelsPath = path.resolve(process.cwd(), 'models');
    const targetPath = path.join(modelsPath, `${modelName}.js`);

    // Ensure the models directory exists
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(targetPath, content);
    console.log(chalk.green(`Model ${modelName} created at ${targetPath}`));
  });

// Migrate command to sync models with the database
program
  .command('migrate')
  .description('Sync all models with the database')
  .action(async () => {
    const configPath = path.resolve(process.cwd(), 'config/database.js');
    const modelsPath = path.resolve(process.cwd(), 'models');

    // Load database configuration
    const dbConfig = require(configPath);
    const sequelize = new Sequelize(dbConfig);

    // Import all models
    const models = {};
    fs.readdirSync(modelsPath)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => {
        const modelPath = path.join(modelsPath, file);
        console.log(`Loading model from: ${modelPath}`);  // Debugging line
        const model = require(modelPath);

        // Ensure model is a function
        if (typeof model !== 'function') {
          console.error(chalk.red(`Error: Model in ${modelPath} is not a function.`));
          return;
        }

        console.log(`Model ${file} loaded successfully.`);  // Debugging line
        models[model.name] = model(sequelize, Sequelize.DataTypes);
      });

    // Apply model associations
    Object.keys(models).forEach((modelName) => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });

    // Sync models with the database
    try {
      await sequelize.sync({ alter: true });
      console.log(chalk.green('Database synced successfully!'));
    } catch (error) {
      console.error(chalk.red('Error syncing database:'), error.message);
    } finally {
      await sequelize.close();
    }
  });

// Command to create Controllers
program
  .command('create-controller <name>')
  .description('Create a new controller with basic CRUD operations')
  .action((name) => {
    const controllersDir = path.join(process.cwd(), 'controllers');
    const controllerName = `${name.charAt(0).toUpperCase() + name.slice(1)}Controller`;
    const filePath = path.join(controllersDir, `${controllerName}.js`);

    // Ensure the controllers directory exists
    if (!fs.existsSync(controllersDir)) {
      fs.mkdirSync(controllersDir, { recursive: true });
    }

    // Controller content template
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

    // Prevent overwriting existing controllers
    if (fs.existsSync(filePath)) {
      console.error(chalk.red(`Controller "${controllerName}" already exists.`));
      return;
    }

    // Write the controller file
    fs.writeFileSync(filePath, content);
    console.log(chalk.green(`Controller "${controllerName}" created at ${filePath}`));
  });

// Command to create Routes
program
  .command('create-route <name>')
  .description('Generate a new route file for a specified controller')
  .action((name) => {
    const routeName = name.charAt(0).toUpperCase() + name.slice(1); // PascalCase
    const lowerRouteName = name.toLowerCase(); // Lowercase for filenames

    // Define the file content
    const content = `
const router = require('express').Router();
const { ${routeName}Controller } = require('../controllers/${routeName}Controller');

// Define routes for ${routeName}
router.get('/', ${routeName}Controller.getAll);
router.get('/:id', ${routeName}Controller.getById);
router.post('/', ${routeName}Controller.create);
router.put('/:id', ${routeName}Controller.update);
router.delete('/:id', ${routeName}Controller.remove);

module.exports = { router };
`;

    // Define the target path
    const routesPath = path.resolve(process.cwd(), 'routes');
    const targetPath = path.join(routesPath, `${lowerRouteName}.js`);

    // Ensure the routes directory exists
    if (!fs.existsSync(routesPath)) {
      fs.mkdirSync(routesPath, { recursive: true });
    }

    // Check if the controller exists
    const controllersPath = path.resolve(process.cwd(), 'controllers');
    const controllerPath = path.join(controllersPath, `${routeName}Controller.js`);
    if (!fs.existsSync(controllerPath)) {
      console.error(chalk.red(`Controller ${routeName}Controller.js does not exist. Create the controller first.`));
      return;
    }

    // Write the file
    if (fs.existsSync(targetPath)) {
      console.error(chalk.red(`Route ${lowerRouteName}.js already exists.`));
    } else {
      fs.writeFileSync(targetPath, content);
      console.log(chalk.green(`Route ${lowerRouteName}.js created at ${targetPath}`));
    }
  });

program
  .command('migrate:undo <model>')
  .description('Undo the migration for the specified model by dropping its table')
  .action(async (model) => {
    const configPath = path.resolve(process.cwd(), 'config/database.js');
    const modelsPath = path.resolve(process.cwd(), 'models');
    const sequelize = new Sequelize(require(configPath));

    try {
      console.log(chalk.blue(`Reverting migration for the model: ${model}`));

      // Load the specified model
      const modelFile = path.join(modelsPath, `${model}.js`);
      if (!fs.existsSync(modelFile)) {
        console.error(chalk.red(`Model "${model}" does not exist in the models directory.`));
        process.exit(1);
      }

      const modelDefinition = require(modelFile);
      const modelInstance = modelDefinition(sequelize, Sequelize.DataTypes);

      // Drop the table associated with the model
      await sequelize.getQueryInterface().dropTable(modelInstance.tableName);
      console.log(chalk.green(`Successfully dropped the table for model "${model}"!`));
    } catch (error) {
      console.error(chalk.red(`Error undoing migration for model "${model}":`, error.message));
    } finally {
      await sequelize.close();
    }
  });

program
  .command('migrate:undo:all')
  .description('Undo all migrations (rollback database to initial state)')
  .action(async () => {
    const configPath = path.resolve(process.cwd(), 'config/database.js');
    const sequelize = new Sequelize(require(configPath));

    try {
      console.log(chalk.blue('Reverting all migrations...'));
      await sequelize.getQueryInterface().dropAllTables();
      console.log(chalk.green('Successfully reverted all migrations!'));
    } catch (error) {
      console.error(chalk.red('Error undoing all migrations:'), error.message);
    } finally {
      await sequelize.close();
    }
  });

program
  .command('make-seed <model>')
  .option('--seed', 'Seed the database with data from the generated JSON')
  .option('--count <number>', 'Number of records to generate', 10)
  .description('Generate a JSON file for seeding or seed data into the database')
  .action(async (modelName, options) => {
    const { seed, count } = options;
    const seedCount = parseInt(count, 10);

    const modelsPath = path.resolve(process.cwd(), 'models');
    const seedDataPath = path.resolve(process.cwd(), 'seeds');
    const modelFile = path.join(modelsPath, `${modelName}.js`);

    if (!fs.existsSync(modelFile)) {
      console.error(chalk.red(`Model "${modelName}" not found in the models directory.`));
      return;
    }

    const sequelize = new Sequelize(require(path.resolve(process.cwd(), 'config/database.js')));
    const model = require(modelFile)(sequelize, Sequelize.DataTypes);

    if (!fs.existsSync(seedDataPath)) {
      fs.mkdirSync(seedDataPath, { recursive: true });
    }

    const jsonFilePath = path.join(seedDataPath, `${modelName.toLowerCase()}-seed.json`);

    if (!seed) {
      const seedData = [];
      for (let i = 0; i < seedCount; i++) {
        const record = {};
        for (const field in model.rawAttributes) {
          if (field === 'id') continue;
          const type = model.rawAttributes[field].type.key;

          switch (type) {
            case 'STRING':
              record[field] = faker.lorem.words(3);
              break;
            case 'TEXT':
              record[field] = faker.lorem.paragraph();
              break;
            case 'INTEGER':
              record[field] = faker.datatype.number();
              break;
            case 'BOOLEAN':
              record[field] = faker.datatype.boolean();
              break;
            case 'DATE':
              record[field] = faker.date.past();
              break;
            case 'UUID':
              record[field] = faker.datatype.uuid();
              break;
            default:
              record[field] = null;
          }
        }
        seedData.push(record);
      }

      fs.writeFileSync(jsonFilePath, JSON.stringify(seedData, null, 2));
      console.log(chalk.green(`Seed data for model "${modelName}" created at ${jsonFilePath}`));
    } else {
      if (!fs.existsSync(jsonFilePath)) {
        console.error(chalk.red(`Seed data JSON file for model "${modelName}" not found.`));
        return;
      }

      const seedData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

      try {
        console.log(chalk.blue(`Seeding ${seedData.length} records into the "${modelName}" table...`));
        await model.bulkCreate(seedData);
        console.log(chalk.green(`Successfully seeded ${seedData.length} records into the "${modelName}" table.`));
      } catch (error) {
        console.error(chalk.red(`Error seeding data into the "${modelName}" table:`, error.message));
      } finally {
        await sequelize.close();
      }
    }
  });

program
  .command('run')
  .description('Start the GreyCode.js application')
  .option('--watch', 'Run the application with nodemon for live reloading')
  .action((options) => {
    if (options.watch) {
      // Use nodemon to run the application
      const nodemon = require('nodemon');
      const appPath = path.resolve(process.cwd(), 'app.js');

      console.log(chalk.blue('Running the application with nodemon...'));
      nodemon({
        script: appPath,
        ext: 'js json',
        watch: [
          path.resolve(process.cwd(), './') // Watch the project directory
        ],
      });

      nodemon
        .on('start', () => {
          console.log(chalk.green('Application has started.'));
        })
        .on('restart', (files) => {
          console.log(chalk.blue('Application restarted due to changes in:'), files);
        })
        .on('quit', () => {
          console.log(chalk.yellow('Application has quit.'));
          process.exit();
        });
    } else {
      // Run the application normally
      console.log(chalk.blue('Running the application...'));
      require(path.resolve(process.cwd(), 'app.js')); // Require your main app.js file
    }
  });

// List all commands
program
  .command('list-commands')
  .description('List all available CLI commands')
  .action(() => {
    console.log('\nAvailable Commands:\n');

    // Calculate padding for alignment
    const commands = program.commands.map((cmd) => ({
      name: cmd.name(),
      description: cmd.description(),
    }));

    const maxCmdLength = Math.max(...commands.map((cmd) => cmd.name.length)) + 2; // Extra padding

    // Render commands in a table format
    commands.forEach((cmd) => {
      console.log(
        `${chalk.bold(cmd.name.padEnd(maxCmdLength))} ${cmd.description}\n`
      );
    });

    console.log('\n\nUse "greycodejs <command> --help" for detailed information about a specific command.\n');
  });

// Parse arguments
program.parse(process.argv);