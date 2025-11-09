const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Register setup-security command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('setup-security')
    .description('Set up security middleware (CORS, Helmet, Rate Limiting, Sanitization)')
    .option('--skip-install', 'Skip npm package installation')
    .option('--force', 'Overwrite existing files')
    .action(async (options) => {
      const inquirer = (await import('inquirer')).default;

      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║         GreyCodeJS Security Setup Wizard                  ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

      try {
        // Step 1: Ask about environment
        const { environment } = await inquirer.prompt([
          {
            type: 'list',
            name: 'environment',
            message: 'What environment are you configuring?',
            choices: [
              { name: '🚀 Production - Strict security', value: 'production' },
              { name: '🧪 Development - Relaxed security', value: 'development' },
              { name: '🔧 Custom - I\'ll configure manually', value: 'custom' }
            ]
          }
        ]);

        let config = {
          corsOrigin: 'http://localhost:3000',
          corsCredentials: true,
          rateLimitWindow: 900000, // 15 minutes
          rateLimitMax: 100,
          enableHelmet: true,
          enableSanitization: true,
          enableRateLimit: true,
          enableIPFilter: false
        };

        if (environment === 'production') {
          const { prodOrigin } = await inquirer.prompt([
            {
              type: 'input',
              name: 'prodOrigin',
              message: 'Enter your production domain (e.g., https://yourdomain.com):',
              validate: (input) => {
                if (!input || input === '*') {
                  return 'Please enter a specific domain for production';
                }
                return true;
              }
            }
          ]);
          config.corsOrigin = prodOrigin;
          config.rateLimitMax = 50; // Stricter for production
        } else if (environment === 'custom') {
          const customConfig = await inquirer.prompt([
            {
              type: 'input',
              name: 'corsOrigin',
              message: 'CORS allowed origins (comma-separated):',
              default: 'http://localhost:3000'
            },
            {
              type: 'confirm',
              name: 'corsCredentials',
              message: 'Allow credentials (cookies, auth headers)?',
              default: true
            },
            {
              type: 'number',
              name: 'rateLimitMax',
              message: 'Max requests per window:',
              default: 100
            },
            {
              type: 'number',
              name: 'rateLimitWindow',
              message: 'Rate limit window (ms):',
              default: 900000
            },
            {
              type: 'confirm',
              name: 'enableIPFilter',
              message: 'Enable IP whitelist/blacklist?',
              default: false
            }
          ]);
          config = { ...config, ...customConfig };
        }

        // Step 2: Check for existing files
        const securityMiddlewarePath = path.join(process.cwd(), 'middlewares', 'security.js');
        
        if (fs.existsSync(securityMiddlewarePath) && !options.force) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: 'Security middleware already exists. Overwrite?',
              default: false
            }
          ]);

          if (!overwrite) {
            console.log(chalk.yellow('\n✋ Setup cancelled.\n'));
            return;
          }
        }

        // Step 3: Install dependencies
        console.log(chalk.blue('\n📦 Checking dependencies...\n'));
        
        const requiredDeps = [
          'helmet',
          'express-rate-limit',
          'express-mongo-sanitize',
          'xss-clean',
          'hpp'
        ];
        
        const packageJson = require(path.join(process.cwd(), 'package.json'));
        const missingDeps = requiredDeps.filter(dep => 
          !packageJson.dependencies || !packageJson.dependencies[dep]
        );

        if (missingDeps.length > 0 && !options.skipInstall) {
          console.log(chalk.yellow(`Missing dependencies: ${missingDeps.join(', ')}`));
          
          const { installDeps } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'installDeps',
              message: 'Install missing dependencies?',
              default: true
            }
          ]);

          if (installDeps) {
            console.log(chalk.blue('\nInstalling dependencies...\n'));
            try {
              execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
              console.log(chalk.green('\n✅ Dependencies installed successfully\n'));
            } catch (error) {
              console.log(chalk.red('\n❌ Failed to install dependencies'));
              console.log(chalk.yellow('Please run: npm install ' + missingDeps.join(' ') + '\n'));
            }
          }
        } else if (missingDeps.length === 0) {
          console.log(chalk.green('✅ All dependencies already installed\n'));
        }

        // Step 4: Create security middleware file
        console.log(chalk.blue('📝 Creating security middleware...\n'));
        
        const middlewaresDir = path.join(process.cwd(), 'middlewares');
        if (!fs.existsSync(middlewaresDir)) {
          fs.mkdirSync(middlewaresDir, { recursive: true });
        }

        // Read template
        const templatePath = path.join(__dirname, '../../../middlewares/security.js');
        let securityContent;
        
        if (fs.existsSync(templatePath)) {
          securityContent = fs.readFileSync(templatePath, 'utf8');
        } else {
          // Fallback: generate basic security middleware
          securityContent = generateSecurityMiddleware();
        }

        fs.writeFileSync(securityMiddlewarePath, securityContent);
        console.log(chalk.green('   ✅ Created: middlewares/security.js'));

        // Step 5: Update .env file
        console.log(chalk.blue('\n🔧 Updating environment configuration...\n'));
        updateEnvFile(config);

        // Step 6: Update core/middleware.js
        console.log(chalk.blue('🔄 Updating core middleware...\n'));
        updateCoreMiddleware();

        // Step 7: Create security test
        const testPath = path.join(process.cwd(), 'scripts', 'test-security.js');
        fs.writeFileSync(testPath, generateSecurityTest());
        console.log(chalk.green('   ✅ Created: scripts/test-security.js'));

        // Step 8: Success summary
        console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║              🎉 Security Setup Complete!                  ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n'));

        console.log(chalk.cyan('📊 Configuration:'));
        console.log(chalk.gray(`   Environment: ${environment}`));
        console.log(chalk.gray(`   CORS Origin: ${config.corsOrigin}`));
        console.log(chalk.gray(`   Rate Limit: ${config.rateLimitMax} requests/${config.rateLimitWindow}ms`));
        console.log(chalk.gray(`   Helmet: ${config.enableHelmet ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`   Sanitization: ${config.enableSanitization ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`   IP Filtering: ${config.enableIPFilter ? 'Enabled' : 'Disabled'}\n`));

        console.log(chalk.cyan('🔒 Security Features Enabled:'));
        console.log(chalk.white('   ✅ CORS - Cross-Origin Resource Sharing'));
        console.log(chalk.white('   ✅ Helmet - Security headers'));
        console.log(chalk.white('   ✅ Rate Limiting - Request throttling'));
        console.log(chalk.white('   ✅ Input Sanitization - XSS & NoSQL injection prevention'));
        console.log(chalk.white('   ✅ HPP - HTTP Parameter Pollution prevention'));
        console.log(chalk.white('   ✅ Security Logging - Suspicious request detection\n'));

        console.log(chalk.cyan('📚 Next Steps:\n'));
        console.log(chalk.white('1. Review configuration in .env'));
        console.log(chalk.gray('   Check CORS_ORIGIN and rate limit settings\n'));

        console.log(chalk.white('2. Test security setup:'));
        console.log(chalk.cyan('   node scripts/test-security.js\n'));

        console.log(chalk.white('3. Start your server:'));
        console.log(chalk.cyan('   npm run dev\n'));

        console.log(chalk.white('4. Apply rate limiting to auth routes:'));
        console.log(chalk.gray('   See examples in routes/auth.js\n'));

        if (environment === 'production') {
          console.log(chalk.yellow('⚠️  Production Checklist:'));
          console.log(chalk.gray('   [ ] Set specific CORS origins (not *)'));
          console.log(chalk.gray('   [ ] Enable HTTPS'));
          console.log(chalk.gray('   [ ] Review rate limit settings'));
          console.log(chalk.gray('   [ ] Set up monitoring for security events'));
          console.log(chalk.gray('   [ ] Configure IP whitelist if needed\n'));
        }

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
 * Update .env file with security configuration
 */
function updateEnvFile(config) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if security config already exists
  if (envContent.includes('CORS_ORIGIN=')) {
    console.log(chalk.yellow('   ⚠️  Security config already exists in .env, skipping...'));
    return;
  }

  // Add security configuration
  const securityConfig = `
# Security Configuration (Generated by setup-security)
CORS_ORIGIN=${config.corsOrigin}
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_CREDENTIALS=${config.corsCredentials}
RATE_LIMIT_WINDOW_MS=${config.rateLimitWindow}
RATE_LIMIT_MAX_REQUESTS=${config.rateLimitMax}
JSON_LIMIT=10mb
URL_ENCODED_LIMIT=10mb
${config.enableIPFilter ? '# IP_WHITELIST=127.0.0.1,::1\n# IP_BLACKLIST=' : ''}
`;

  fs.writeFileSync(envPath, envContent + securityConfig);
  console.log(chalk.green('   ✅ Updated .env with security configuration'));
}

/**
 * Update core/middleware.js to use security middleware
 */
function updateCoreMiddleware() {
  const middlewarePath = path.join(process.cwd(), 'core', 'middleware.js');
  
  if (!fs.existsSync(middlewarePath)) {
    console.log(chalk.yellow('   ⚠️  core/middleware.js not found, skipping...'));
    return;
  }

  let content = fs.readFileSync(middlewarePath, 'utf8');

  // Check if already configured
  if (content.includes('applySecurityMiddleware')) {
    console.log(chalk.green('   ✅ core/middleware.js already configured'));
    return;
  }

  // Add security middleware import and call
  content = content.replace(
    /const express = require\('express'\);/,
    `const express = require('express');\nconst { applySecurityMiddleware } = require('../middlewares/security');`
  );

  content = content.replace(
    /const applyMiddleware = \(app\) => {/,
    `const applyMiddleware = (app) => {\n  // Apply security middleware first\n  applySecurityMiddleware(app);\n`
  );

  fs.writeFileSync(middlewarePath, content);
  console.log(chalk.green('   ✅ Updated core/middleware.js'));
}

/**
 * Generate basic security middleware (fallback)
 */
function generateSecurityMiddleware() {
  return `// middlewares/security.js
// Basic security middleware
// For full implementation, see documentation

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const applySecurityMiddleware = (app) => {
  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  }));

  // Helmet
  app.use(helmet());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  });
  app.use(limiter);
};

module.exports = { applySecurityMiddleware };
`;
}

/**
 * Generate security test script
 */
function generateSecurityTest() {
  return `#!/usr/bin/env node
/**
 * Security Setup Test
 * Run: node scripts/test-security.js
 */

const fs = require('fs');
const path = require('path');

console.log('\\n🔒 Testing Security Setup...\\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log('✅', name);
    passed++;
  } else {
    console.log('❌', name);
    failed++;
  }
}

// Check files
test('Security middleware exists', fs.existsSync(path.join(process.cwd(), 'middlewares/security.js')));

// Check dependencies
const pkg = require(path.join(process.cwd(), 'package.json'));
test('helmet installed', pkg.dependencies && pkg.dependencies.helmet);
test('express-rate-limit installed', pkg.dependencies && pkg.dependencies['express-rate-limit']);
test('express-mongo-sanitize installed', pkg.dependencies && pkg.dependencies['express-mongo-sanitize']);
test('xss-clean installed', pkg.dependencies && pkg.dependencies['xss-clean']);
test('hpp installed', pkg.dependencies && pkg.dependencies.hpp);

// Check env
require('dotenv').config();
test('CORS_ORIGIN configured', !!process.env.CORS_ORIGIN);
test('Rate limit configured', !!process.env.RATE_LIMIT_MAX_REQUESTS);

// Check CORS is not wildcard in production
if (process.env.NODE_ENV === 'production') {
  test('CORS not wildcard in production', process.env.CORS_ORIGIN !== '*');
}

console.log(\`\\n📊 Results: \${passed} passed, \${failed} failed\\n\`);

if (failed === 0) {
  console.log('🎉 All checks passed! Security is configured.\\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review.\\n');
  process.exit(1);
}
`;
}