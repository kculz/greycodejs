const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Register create-validator command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('create-validator <name>')
    .description('Create a new validation schema file')
    .option('--crud', 'Include CRUD validation schemas', false)
    .action((name, options) => {
      const validatorsDir = path.join(process.cwd(), 'validators');
      const validatorName = `${name.charAt(0).toLowerCase() + name.slice(1)}Validator`;
      const filePath = path.join(validatorsDir, `${validatorName}.js`);

      // Ensure validators directory exists
      if (!fs.existsSync(validatorsDir)) {
        fs.mkdirSync(validatorsDir, { recursive: true });
        console.log(chalk.blue('Created validators directory'));
      }

      // Check if validator already exists
      if (fs.existsSync(filePath)) {
        console.error(chalk.red(`Validator "${validatorName}" already exists at ${filePath}`));
        process.exit(1);
      }

      // Generate content
      const modelName = name.charAt(0).toUpperCase() + name.slice(1);
      
      let content;
      if (options.crud) {
        content = `// validators/${validatorName}.js
const { Joi, commonSchemas } = require('../middlewares/validate');

/**
 * ${modelName} Validation Schemas
 * Centralized validation rules for ${modelName}-related operations
 */

// Create ${modelName} validation
const create${modelName} = Joi.object({
  // Add your fields here
  // Example:
  // name: commonSchemas.name.required(),
  // email: commonSchemas.email.required(),
  // description: commonSchemas.description,
}).options({ stripUnknown: true });

// Update ${modelName} validation
const update${modelName} = Joi.object({
  // Add your fields here (all optional for updates)
  // Example:
  // name: commonSchemas.name,
  // email: commonSchemas.email,
  // description: commonSchemas.description,
}).min(1).options({ stripUnknown: true }); // At least one field required

// Get ${modelName}s query parameters validation
const get${modelName}sQuery = Joi.object({
  page: commonSchemas.pagination.page,
  limit: commonSchemas.pagination.limit,
  sortBy: Joi.string().valid('createdAt', 'updatedAt').default('createdAt'),
  sortOrder: commonSchemas.pagination.sortOrder,
  search: Joi.string().max(100).trim()
}).options({ stripUnknown: true });

module.exports = {
  create${modelName},
  update${modelName},
  get${modelName}sQuery
};`;
      } else {
        content = `// validators/${validatorName}.js
const { Joi, commonSchemas } = require('../middlewares/validate');

/**
 * ${modelName} Validation Schemas
 * Add your custom validation rules here
 */

// Example validation schema
const example${modelName}Schema = Joi.object({
  // Add your fields here
  // Example:
  // name: Joi.string().required(),
  // email: commonSchemas.email.required(),
  // age: Joi.number().integer().min(0).max(120),
}).options({ stripUnknown: true });

module.exports = {
  example${modelName}Schema
};`;
      }

      // Write the validator file
      fs.writeFileSync(filePath, content);
      
      console.log(chalk.green(`\n✅ Validator "${validatorName}" created successfully!`));
      console.log(chalk.gray(`   Location: ${filePath}`));
      
      console.log(chalk.blue('\n📝 Next steps:'));
      console.log(chalk.gray(`   1. Edit ${validatorName}.js to define your validation schemas`));
      console.log(chalk.gray('   2. Import and use in your routes:'));
      console.log(chalk.cyan(`      const { validate } = require('../middlewares/validate');`));
      console.log(chalk.cyan(`      const { create${modelName} } = require('../validators/${validatorName}');`));
      console.log(chalk.cyan(`      router.post('/', validate(create${modelName}), controller.create);`));
      
      console.log(chalk.blue('\n💡 Available common schemas:'));
      console.log(chalk.gray('   - commonSchemas.uuid'));
      console.log(chalk.gray('   - commonSchemas.email'));
      console.log(chalk.gray('   - commonSchemas.password'));
      console.log(chalk.gray('   - commonSchemas.phone'));
      console.log(chalk.gray('   - commonSchemas.url'));
      console.log(chalk.gray('   - commonSchemas.name'));
      console.log(chalk.gray('   - commonSchemas.username'));
      console.log(chalk.gray('   - See middlewares/validate.js for full list\n'));
    });
};