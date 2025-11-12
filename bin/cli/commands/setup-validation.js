const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Register setup-validation command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('setup-validation')
    .description('Set up validation system for your application')
    .option('--skip-install', 'Skip npm package installation')
    .option('--with-examples', 'Create example validators', true)
    .action(async (options) => {
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║         GreyCodeJS Validation Setup Wizard                ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

      try {
        let filesCreated = 0;
        let errors = [];

        // Step 1: Check/Install Joi
        console.log(chalk.blue('📦 [1/4] Checking dependencies...\n'));
        
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        let packageJson = {};
        
        if (fs.existsSync(packageJsonPath)) {
          packageJson = require(packageJsonPath);
        }
        
        if (!packageJson.dependencies || !packageJson.dependencies.joi) {
          if (options.skipInstall) {
            console.log(chalk.yellow('⚠️  Joi not installed. Please run: npm install joi\n'));
          } else {
            console.log(chalk.blue('Installing joi...\n'));
            try {
              execSync('npm install joi', { stdio: 'inherit' });
              console.log(chalk.green('\n✅ Joi installed successfully\n'));
            } catch (error) {
              console.log(chalk.red('❌ Failed to install Joi'));
              console.log(chalk.yellow('Please run manually: npm install joi\n'));
            }
          }
        } else {
          console.log(chalk.green('✅ Joi already installed\n'));
        }

        // Step 2: Create validation middleware
        console.log(chalk.blue('📝 [2/4] Creating validation middleware...\n'));
        
        const middlewaresDir = path.join(process.cwd(), 'middlewares');
        const validatePath = path.join(middlewaresDir, 'validate.js');
        
        if (!fs.existsSync(middlewaresDir)) {
          fs.mkdirSync(middlewaresDir, { recursive: true });
        }

        if (!fs.existsSync(validatePath)) {
          const validateContent = getValidateMiddlewareContent();
          fs.writeFileSync(validatePath, validateContent);
          console.log(chalk.green('   ✅ Created: middlewares/validate.js'));
          filesCreated++;
        } else {
          console.log(chalk.yellow('   ⚠️  middlewares/validate.js already exists, skipping'));
        }

        // Step 3: Create validators directory
        console.log(chalk.blue('\n📁 [3/4] Creating validators directory...\n'));
        
        const validatorsDir = path.join(process.cwd(), 'validators');
        if (!fs.existsSync(validatorsDir)) {
          fs.mkdirSync(validatorsDir, { recursive: true });
          console.log(chalk.green('   ✅ Created: validators/'));
          filesCreated++;
        } else {
          console.log(chalk.green('   ✅ validators/ directory exists'));
        }

        // Step 4: Create example validators
        if (options.withExamples) {
          console.log(chalk.blue('\n📄 [4/4] Creating example validators...\n'));
          
          const userValidatorPath = path.join(validatorsDir, 'userValidator.js');
          if (!fs.existsSync(userValidatorPath)) {
            const userValidatorContent = getUserValidatorContent();
            fs.writeFileSync(userValidatorPath, userValidatorContent);
            console.log(chalk.green('   ✅ Created: validators/userValidator.js'));
            filesCreated++;
          } else {
            console.log(chalk.yellow('   ⚠️  validators/userValidator.js already exists, skipping'));
          }
        }

        // Step 5: Create documentation
        console.log(chalk.blue('\n📚 Creating documentation...\n'));
        
        const docsPath = path.join(process.cwd(), 'VALIDATION_GUIDE.md');
        if (!fs.existsSync(docsPath)) {
          const docsContent = getDocumentationContent();
          fs.writeFileSync(docsPath, docsContent);
          console.log(chalk.green('   ✅ Created: VALIDATION_GUIDE.md'));
          filesCreated++;
        } else {
          console.log(chalk.yellow('   ⚠️  VALIDATION_GUIDE.md already exists, skipping'));
        }

        // Success summary
        console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║              🎉 Validation Setup Complete!                ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n'));

        console.log(chalk.cyan('📊 Summary:'));
        console.log(chalk.gray(`   Files created: ${filesCreated}`));
        console.log(chalk.gray(`   Dependencies: ${packageJson.dependencies?.joi ? 'Already installed' : 'Installed'}\n`));

        console.log(chalk.cyan('📚 Files Created:\n'));
        console.log(chalk.white('   ✅ middlewares/validate.js - Validation middleware'));
        console.log(chalk.white('   ✅ validators/ - Validators directory'));
        if (options.withExamples) {
          console.log(chalk.white('   ✅ validators/userValidator.js - Example validator'));
        }
        console.log(chalk.white('   ✅ VALIDATION_GUIDE.md - Complete documentation\n'));

        console.log(chalk.cyan('🚀 Quick Start:\n'));
        
        console.log(chalk.white('1. Create a validator for your model:'));
        console.log(chalk.cyan('   npm run cli -- create-validator Product --crud\n'));

        console.log(chalk.white('2. Use validation in your routes:'));
        console.log(chalk.gray('   const { validate } = require(\'../middlewares/validate\');'));
        console.log(chalk.gray('   const validator = require(\'../validators/productValidator\');'));
        console.log(chalk.gray('   router.post(\'/\', validate(validator.createProduct), controller.create);\n'));

        console.log(chalk.white('3. Check the documentation:'));
        console.log(chalk.cyan('   cat VALIDATION_GUIDE.md\n'));

        console.log(chalk.yellow('💡 Pro Tips:\n'));
        console.log(chalk.gray('   • Always validate user input at the route level'));
        console.log(chalk.gray('   • Use commonSchemas for consistent validation rules'));
        console.log(chalk.gray('   • Test your validation schemas thoroughly'));
        console.log(chalk.gray('   • Add custom error messages for better UX\n'));

      } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error.message);
        if (process.env.NODE_ENV === 'development') {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
};

/**
 * Get validation middleware content (truncated for brevity)
 */
function getValidateMiddlewareContent() {
  return `// middlewares/validate.js
const Joi = require('joi');
const logger = require('../utils/logger');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    if (!dataToValidate) {
      logger.warn(\`Validation attempted on undefined req.\${source}\`);
      return res.status(400).json({
        success: false,
        message: \`No \${source} data provided for validation\`
      });
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logger.warn('Validation failed:', { source, errors, path: req.path, method: req.method });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    req[source] = value;
    next();
  };
};

const commonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[A-Za-z])(?=.*\\d)/).message('Password must contain at least one letter and one number'),
  name: Joi.string().min(2).max(100).trim(),
  username: Joi.string().alphanum().min(3).max(30).lowercase().trim(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }
};

const validateId = (paramName = 'id', type = 'uuid') => {
  const schema = type === 'uuid' 
    ? Joi.object({ [paramName]: commonSchemas.uuid.required() })
    : Joi.object({ [paramName]: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required() });
  
  return validate(schema, 'params');
};

module.exports = { validate, validateId, commonSchemas, Joi };
`;
}

/**
 * Get user validator content
 */
function getUserValidatorContent() {
  return `// validators/userValidator.js
const { Joi, commonSchemas } = require('../middlewares/validate');

const registerUser = Joi.object({
  username: commonSchemas.username.required(),
  email: commonSchemas.email.required(),
  password: commonSchemas.password.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords must match'
  })
}).options({ stripUnknown: true });

const loginUser = Joi.object({
  email: commonSchemas.email.required(),
  password: Joi.string().required()
}).options({ stripUnknown: true });

const updateUser = Joi.object({
  username: commonSchemas.username,
  email: commonSchemas.email
}).min(1).options({ stripUnknown: true });

const getUsersQuery = Joi.object({
  page: commonSchemas.pagination.page,
  limit: commonSchemas.pagination.limit,
  sortBy: Joi.string().valid('username', 'email', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: commonSchemas.pagination.sortOrder,
  search: Joi.string().max(100).trim()
}).options({ stripUnknown: true });

module.exports = { registerUser, loginUser, updateUser, getUsersQuery };
`;
}

/**
 * Get documentation content
 */
function getDocumentationContent() {
  return `# GreyCodeJS Validation Guide

## Quick Start

\`\`\`bash
npm install joi
npm run cli -- setup-validation
\`\`\`

## Basic Usage

\`\`\`javascript
const { validate, Joi } = require('../middlewares/validate');

const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

router.post('/users', validate(schema), controller.create);
\`\`\`

For complete documentation, see: https://joi.dev/api/
`;
}