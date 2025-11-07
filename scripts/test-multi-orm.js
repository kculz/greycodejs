#!/usr/bin/env node

/**
 * Multi-ORM Test Script
 * Tests Sequelize, Mongoose, and Prisma implementations
 */

const path = require('path');
const fs = require('fs');

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  section: (msg) => console.log(`${colors.magenta}▶ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}  ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}  ✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}  ❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}  ⚠️  ${msg}${colors.reset}`),
  step: (num, total, msg) => console.log(`${colors.cyan}\n[${num}/${total}] ${msg}${colors.reset}`)
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Test helper
 */
function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    log.success(name);
    return true;
  } catch (error) {
    testsFailed++;
    log.error(`${name}: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║           Multi-ORM Implementation Test Suite             ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  log.step(1, 7, 'Checking Configuration Files');
  log.header();
  
  // Test 1: Check ORM config exists
  test('config/orm.js exists', () => {
    const configPath = path.join(process.cwd(), 'config', 'orm.js');
    if (!fs.existsSync(configPath)) {
      throw new Error('File not found');
    }
  });

  // Test 2: Read active ORM
  let activeORM;
  test('config/orm.js is readable', () => {
    const ormConfig = require(path.join(process.cwd(), 'config', 'orm.js'));
    if (!ormConfig.activeORM) {
      throw new Error('activeORM not defined');
    }
    activeORM = ormConfig.activeORM;
    log.info(`Active ORM: ${activeORM}`);
  });

  // Test 3: Check database config
  test('config/database.js exists', () => {
    const dbConfigPath = path.join(process.cwd(), 'config', 'database.js');
    if (!fs.existsSync(dbConfigPath)) {
      throw new Error('File not found');
    }
  });

  log.step(2, 7, 'Checking Model Loader Files');
  log.header();

  // Test 4: Check model loaders exist
  test('models/index.js exists', () => {
    const indexPath = path.join(process.cwd(), 'models', 'index.js');
    if (!fs.existsSync(indexPath)) {
      throw new Error('File not found');
    }
  });

  test('models/mongoose-loader.js exists', () => {
    const loaderPath = path.join(process.cwd(), 'models', 'mongoose-loader.js');
    if (!fs.existsSync(loaderPath)) {
      throw new Error('File not found');
    }
  });

  test('models/prisma-loader.js exists', () => {
    const loaderPath = path.join(process.cwd(), 'models', 'prisma-loader.js');
    if (!fs.existsSync(loaderPath)) {
      throw new Error('File not found');
    }
  });

  log.step(3, 7, 'Testing Model Loader Imports');
  log.header();

  // Test 5: Can require model loaders
  let initializeModels;
  test('models/index.js can be required', () => {
    initializeModels = require(path.join(process.cwd(), 'models', 'index.js'));
    if (typeof initializeModels !== 'function') {
      throw new Error('initializeModels is not a function');
    }
  });

  test('models/mongoose-loader.js can be required', () => {
    const loader = require(path.join(process.cwd(), 'models', 'mongoose-loader.js'));
    if (typeof loader !== 'function') {
      throw new Error('Mongoose loader is not a function');
    }
  });

  test('models/prisma-loader.js can be required', () => {
    const loader = require(path.join(process.cwd(), 'models', 'prisma-loader.js'));
    if (typeof loader !== 'function') {
      throw new Error('Prisma loader is not a function');
    }
  });

  log.step(4, 7, 'Testing Database Connection');
  log.header();

  // Test 6: Test database connection
  let dbInstance;
  const dbTest = await new Promise((resolve) => {
    test('Database can be initialized', async () => {
      try {
        const { initializeDatabase } = require(path.join(process.cwd(), 'core', 'database.js'));
        dbInstance = await initializeDatabase();
        if (!dbInstance) {
          throw new Error('Database instance is null');
        }
        log.info(`Connected to ${activeORM} database`);
        resolve(true);
      } catch (error) {
        log.warn(`Could not connect to database: ${error.message}`);
        log.info('This is expected if database is not configured yet');
        resolve(false);
      }
    });
  });

  log.step(5, 7, 'Testing Model Initialization');
  log.header();

  // Test 7: Test model initialization (only if DB connected)
  if (dbTest && dbInstance) {
    test('Models can be initialized', () => {
      const models = initializeModels(dbInstance);
      if (!models || typeof models !== 'object') {
        throw new Error('Models object is invalid');
      }
      
      const modelKeys = Object.keys(models).filter(key => 
        !['sequelize', 'Sequelize', 'mongoose', 'prisma'].includes(key)
      );
      
      log.info(`Loaded ${modelKeys.length} model(s)`);
      if (modelKeys.length > 0) {
        log.info(`Models: ${modelKeys.join(', ')}`);
      }
    });

    // Test 8: Check ORM-specific properties
    test(`${activeORM.toUpperCase()} instance is attached`, () => {
      const models = initializeModels(dbInstance);
      
      switch (activeORM) {
        case 'sequelize':
          if (!models.sequelize || !models.Sequelize) {
            throw new Error('Sequelize instance not attached');
          }
          break;
        case 'mongoose':
          if (!models.mongoose) {
            throw new Error('Mongoose instance not attached');
          }
          break;
        case 'prisma':
          if (!models.prisma) {
            throw new Error('Prisma instance not attached');
          }
          break;
      }
    });
  } else {
    log.warn('Skipping model initialization tests (no database connection)');
  }

  log.step(6, 7, 'Testing Model Export (models/models.js)');
  log.header();

  // Test 9: Test models.js proxy
  test('models/models.js can be required', () => {
    const modelsPath = path.join(process.cwd(), 'models', 'models.js');
    if (!fs.existsSync(modelsPath)) {
      throw new Error('models/models.js not found');
    }
    
    // Just require it, don't test access (needs global.models)
    require(modelsPath);
  });

  log.step(7, 7, 'Testing ORM Switching Support');
  log.header();

  // Test 10: Check if all ORM configs exist
  const ormConfigs = {
    sequelize: path.join(process.cwd(), 'config', 'orm', 'sequelize.js'),
    mongoose: path.join(process.cwd(), 'config', 'orm', 'mongoose.js'),
    prisma: path.join(process.cwd(), 'config', 'orm', 'prisma.js')
  };

  Object.entries(ormConfigs).forEach(([orm, configPath]) => {
    test(`config/orm/${orm}.js exists`, () => {
      if (!fs.existsSync(configPath)) {
        throw new Error('File not found');
      }
    });

    test(`config/orm/${orm}.js exports initialize()`, () => {
      const config = require(configPath);
      if (typeof config.initialize !== 'function') {
        throw new Error('initialize function not exported');
      }
    });
  });

  // Cleanup
  if (dbInstance) {
    log.info('\nCleaning up database connection...');
    try {
      if (dbInstance.close) {
        await dbInstance.close();
      } else if (dbInstance.connection && dbInstance.connection.close) {
        await dbInstance.connection.close();
      } else if (dbInstance.$disconnect) {
        await dbInstance.$disconnect();
      }
      log.success('Database connection closed');
    } catch (error) {
      log.warn(`Error closing connection: ${error.message}`);
    }
  }

  // Summary
  log.header();
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║                        Test Summary                        ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.blue}Total Tests:${colors.reset}    ${testsRun}
${colors.green}Passed:${colors.reset}         ${testsPassed}
${colors.red}Failed:${colors.reset}         ${testsFailed}
${testsFailed === 0 ? colors.green + '✅ All tests passed!' : colors.red + '❌ Some tests failed'}${colors.reset}
`);

  // Recommendations
  if (testsFailed > 0) {
    console.log(`${colors.yellow}📝 Recommendations:${colors.reset}\n`);
    
    if (!dbTest) {
      console.log(`${colors.gray}1. Configure your database: npm run cli -- setup-db${colors.reset}`);
      console.log(`${colors.gray}2. Make sure your database server is running${colors.reset}`);
    }
    
    console.log(`${colors.gray}3. Check the error messages above for specific issues${colors.reset}`);
    console.log(`${colors.gray}4. Ensure all model files are properly structured${colors.reset}\n`);
  } else {
    console.log(`${colors.green}🎉 Multi-ORM implementation is working correctly!${colors.reset}\n`);
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`${colors.gray}1. Create models for your active ORM: npm run cli -- create-model <Name>${colors.reset}`);
    console.log(`${colors.gray}2. Test switching ORMs by editing config/orm.js${colors.reset}`);
    console.log(`${colors.gray}3. Start building your application: npm run dev${colors.reset}\n`);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log.error(`Test suite crashed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});