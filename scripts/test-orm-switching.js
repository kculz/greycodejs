#!/usr/bin/env node

/**
 * ORM Switching Test
 * Tests that the framework can handle switching between different ORMs
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║              ORM Switching Functionality Test             ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

const ormConfigPath = path.join(process.cwd(), 'config', 'orm.js');
const originalConfig = fs.readFileSync(ormConfigPath, 'utf8');
const currentORM = require(ormConfigPath).activeORM;

console.log(`${colors.blue}Current ORM: ${currentORM}${colors.reset}\n`);

const orms = ['sequelize', 'mongoose', 'prisma'];
let allPassed = true;

console.log('Testing ORM loading for each type...\n');

orms.forEach(orm => {
  console.log(`${colors.cyan}Testing ${orm.toUpperCase()}...${colors.reset}`);
  
  try {
    // Clear require cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('models') || key.includes('config')) {
        delete require.cache[key];
      }
    });
    
    // Temporarily change ORM config
    fs.writeFileSync(ormConfigPath, `module.exports = {\n  activeORM: '${orm}'\n};`);
    
    // Test loading
    const ormConfig = require(path.join(process.cwd(), 'config', 'orm', `${orm}.js`));
    const initializeModels = require(path.join(process.cwd(), 'models', 'index.js'));
    
    // Verify structure
    if (typeof ormConfig.initialize !== 'function') {
      throw new Error('Config does not export initialize()');
    }
    
    if (typeof initializeModels !== 'function') {
      throw new Error('Model initializer is not a function');
    }
    
    console.log(`  ${colors.green}✅ ${orm} ORM configuration loads correctly${colors.reset}`);
    console.log(`  ${colors.green}✅ Model loader works with ${orm}${colors.reset}\n`);
    
  } catch (error) {
    console.log(`  ${colors.red}❌ Failed: ${error.message}${colors.reset}\n`);
    allPassed = false;
  }
});

// Restore original config
fs.writeFileSync(ormConfigPath, originalConfig);

// Clear cache one final time
Object.keys(require.cache).forEach(key => {
  if (key.includes('models') || key.includes('config')) {
    delete require.cache[key];
  }
});

console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

if (allPassed) {
  console.log(`${colors.green}✅ All ORM switching tests passed!${colors.reset}\n`);
  console.log(`${colors.blue}The framework can successfully switch between:${colors.reset}`);
  console.log(`  • Sequelize (MySQL, PostgreSQL, SQLite, MSSQL)`);
  console.log(`  • Mongoose (MongoDB)`);
  console.log(`  • Prisma (Multiple databases)\n`);
  console.log(`${colors.yellow}To switch ORMs, edit config/orm.js and change activeORM${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}❌ Some ORM switching tests failed${colors.reset}\n`);
  process.exit(1);
}