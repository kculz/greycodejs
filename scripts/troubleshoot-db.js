#!/usr/bin/env node

/**
 * Database Connection Troubleshooter
 * Helps diagnose database connection issues
 */

const { execSync } = require('child_process');
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

console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗`);
console.log(`║   Database Connection Troubleshooter          ║`);
console.log(`╚════════════════════════════════════════════════╝${colors.reset}\n`);

// 1. Check if database config exists
console.log(`${colors.blue}[1/6]${colors.reset} Checking database configuration...`);

const dbConfigPath = path.join(process.cwd(), 'config', 'database.js');
if (!fs.existsSync(dbConfigPath)) {
  console.log(`${colors.red}❌ config/database.js not found!${colors.reset}`);
  console.log(`${colors.yellow}   Run: npm run cli -- setup-db${colors.reset}\n`);
  process.exit(1);
}

const dbConfig = require(dbConfigPath);
console.log(`${colors.green}✅ Configuration file found${colors.reset}`);
console.log(`   Dialect: ${dbConfig.dialect || 'unknown'}`);
console.log(`   Host: ${dbConfig.host || 'localhost'}`);
console.log(`   Port: ${dbConfig.port || 'default'}`);
console.log(`   Database: ${dbConfig.database || 'N/A'}\n`);

// 2. Check if ORM is configured
console.log(`${colors.blue}[2/6]${colors.reset} Checking ORM configuration...`);

const ormConfigPath = path.join(process.cwd(), 'config', 'orm.js');
if (!fs.existsSync(ormConfigPath)) {
  console.log(`${colors.red}❌ config/orm.js not found!${colors.reset}`);
  console.log(`${colors.yellow}   Create it with: activeORM: 'sequelize'${colors.reset}\n`);
  process.exit(1);
}

const ormConfig = require(ormConfigPath);
console.log(`${colors.green}✅ ORM configured: ${ormConfig.activeORM}${colors.reset}\n`);

// 3. Check if database server is running
console.log(`${colors.blue}[3/6]${colors.reset} Checking if database server is running...`);

let isRunning = false;
let command = '';

switch (dbConfig.dialect) {
  case 'mysql':
    command = 'pgrep -x mysqld || pgrep -x mysql';
    break;
  case 'postgres':
    command = 'pgrep -x postgres';
    break;
  case 'sqlite':
    console.log(`${colors.green}✅ SQLite (file-based, no server needed)${colors.reset}\n`);
    isRunning = true;
    break;
  default:
    console.log(`${colors.yellow}⚠️  Cannot check ${dbConfig.dialect} status${colors.reset}\n`);
    isRunning = null;
}

if (command) {
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`${colors.green}✅ ${dbConfig.dialect} server is running${colors.reset}\n`);
    isRunning = true;
  } catch (error) {
    console.log(`${colors.red}❌ ${dbConfig.dialect} server is NOT running!${colors.reset}`);
    console.log(`${colors.yellow}   Start it with:${colors.reset}`);
    
    if (dbConfig.dialect === 'mysql') {
      console.log(`${colors.gray}   macOS: brew services start mysql${colors.reset}`);
      console.log(`${colors.gray}   Linux: sudo systemctl start mysql${colors.reset}`);
      console.log(`${colors.gray}   Windows: net start mysql${colors.reset}`);
    } else if (dbConfig.dialect === 'postgres') {
      console.log(`${colors.gray}   macOS: brew services start postgresql${colors.reset}`);
      console.log(`${colors.gray}   Linux: sudo systemctl start postgresql${colors.reset}`);
      console.log(`${colors.gray}   Windows: net start postgresql${colors.reset}`);
    }
    console.log('');
  }
}

// 4. Test database connection
if (isRunning) {
  console.log(`${colors.blue}[4/6]${colors.reset} Testing database connection...`);
  
  try {
    const { initializeDatabase } = require('../core/database');
    
    (async () => {
      try {
        const db = await initializeDatabase();
        console.log(`${colors.green}✅ Successfully connected to database!${colors.reset}\n`);
        
        // Close connection
        if (db.close) {
          await db.close();
        } else if (db.connection && db.connection.close) {
          await db.connection.close();
        } else if (db.$disconnect) {
          await db.$disconnect();
        }
        
        console.log(`${colors.green}╔════════════════════════════════════════════════╗`);
        console.log(`║  ✅ All checks passed! Database is ready!     ║`);
        console.log(`╚════════════════════════════════════════════════╝${colors.reset}\n`);
        
        console.log(`${colors.cyan}You can now run:${colors.reset}`);
        console.log(`  npm run dev\n`);
        
        process.exit(0);
      } catch (error) {
        console.log(`${colors.red}❌ Connection test failed!${colors.reset}`);
        console.log(`   Error: ${error.message}\n`);
        
        // Provide specific solutions
        console.log(`${colors.yellow}Common solutions:${colors.reset}`);
        
        if (error.message.includes('authentication') || error.message.includes('Access denied')) {
          console.log(`${colors.gray}1. Check username/password in config/database.js${colors.reset}`);
          console.log(`${colors.gray}2. Verify user has proper permissions${colors.reset}`);
          console.log(`${colors.gray}3. For MySQL: ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';${colors.reset}`);
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
          console.log(`${colors.gray}1. Start your database server${colors.reset}`);
          console.log(`${colors.gray}2. Check if port ${dbConfig.port} is correct${colors.reset}`);
          console.log(`${colors.gray}3. Check if host ${dbConfig.host} is accessible${colors.reset}`);
        } else if (error.message.includes('Unknown database')) {
          console.log(`${colors.gray}1. The database will be auto-created on first run${colors.reset}`);
          console.log(`${colors.gray}2. Or create manually: CREATE DATABASE ${dbConfig.database};${colors.reset}`);
        }
        
        console.log('');
        process.exit(1);
      }
    })();
  } catch (error) {
    console.log(`${colors.red}❌ Error loading database module${colors.reset}`);
    console.log(`   ${error.message}\n`);
    process.exit(1);
  }
} else {
  console.log(`${colors.red}Cannot proceed with connection test - database server not running${colors.reset}\n`);
  process.exit(1);
}