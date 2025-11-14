#!/usr/bin/env node

/**
 * Email System Test Script
 * Tests email configuration and functionality
 */

const fs = require('fs');
const path = require('path');

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Test helper
 */
function test(name, condition, details = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    log.success(name);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
    return true;
  } else {
    testsFailed++;
    log.error(name);
    if (details) console.log(`   ${colors.red}${details}${colors.reset}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║              Email System Test Suite                      ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Load environment
  require('dotenv').config();

  log.section('1. Configuration Files');

  // Test 1: EmailService exists
  test(
    'EmailService exists',
    fs.existsSync(path.join(process.cwd(), 'services', 'EmailService.js'))
  );

  // Test 2: Email config exists
  test(
    'Email config exists',
    fs.existsSync(path.join(process.cwd(), 'config', 'email.js'))
  );

  // Test 3: Templates directory exists
  const templatesPath = path.join(process.cwd(), 'templates', 'emails');
  test(
    'Email templates directory exists',
    fs.existsSync(templatesPath)
  );

  // Test 4: Check template files
  if (fs.existsSync(templatesPath)) {
    const templates = fs.readdirSync(templatesPath).filter(f => f.endsWith('.ejs'));
    test(
      'Email templates found',
      templates.length > 0,
      `Found: ${templates.join(', ')}`
    );
  }

  log.section('2. Dependencies');

  const packageJson = require(path.join(process.cwd(), 'package.json'));

  // Test 5: Nodemailer installed
  test(
    'nodemailer installed',
    packageJson.dependencies && packageJson.dependencies.nodemailer
  );

  // Test 6: EJS installed
  test(
    'ejs installed',
    packageJson.dependencies && packageJson.dependencies.ejs
  );

  log.section('3. Environment Configuration');

  // Test 7: EMAIL_PROVIDER set
  test(
    'EMAIL_PROVIDER configured',
    !!process.env.EMAIL_PROVIDER,
    process.env.EMAIL_PROVIDER ? `Provider: ${process.env.EMAIL_PROVIDER}` : ''
  );

  // Test 8: EMAIL_FROM set
  test(
    'EMAIL_FROM configured',
    !!process.env.EMAIL_FROM,
    process.env.EMAIL_FROM || ''
  );

  // Provider-specific tests
  if (process.env.EMAIL_PROVIDER) {
    const provider = process.env.EMAIL_PROVIDER.toLowerCase();

    switch (provider) {
      case 'smtp':
        test('SMTP_HOST configured', !!process.env.SMTP_HOST, process.env.SMTP_HOST || '');
        test('SMTP_USER configured', !!process.env.SMTP_USER);
        test('SMTP_PASSWORD configured', !!process.env.SMTP_PASSWORD);
        break;
      case 'sendgrid':
        test('SENDGRID_API_KEY configured', !!process.env.SENDGRID_API_KEY);
        break;
      case 'ses':
        test('AWS_ACCESS_KEY_ID configured', !!process.env.AWS_ACCESS_KEY_ID);
        test('AWS_SECRET_ACCESS_KEY configured', !!process.env.AWS_SECRET_ACCESS_KEY);
        break;
      case 'mailgun':
        test('MAILGUN_API_KEY configured', !!process.env.MAILGUN_API_KEY);
        test('MAILGUN_DOMAIN configured', !!process.env.MAILGUN_DOMAIN);
        break;
    }
  }

  log.section('4. Service Functionality');

  // Test 9: Can require EmailService
  let EmailService;
  try {
    EmailService = require(path.join(process.cwd(), 'services', 'EmailService.js'));
    test('EmailService can be required', true);
  } catch (error) {
    test('EmailService can be required', false, error.message);
  }

  // Test 10: EmailService has required methods
  if (EmailService) {
    test('EmailService.send() exists', typeof EmailService.send === 'function');
    test('EmailService.sendTemplate() exists', typeof EmailService.sendTemplate === 'function');
    test('EmailService.sendWelcomeEmail() exists', typeof EmailService.sendWelcomeEmail === 'function');
    test('EmailService.renderTemplate() exists', typeof EmailService.renderTemplate === 'function');
  }

  log.section('5. Optional: Queue System');

  // Test 11: Queue dependencies (optional)
  const hasBull = packageJson.dependencies && packageJson.dependencies.bull;
  const hasRedis = packageJson.dependencies && packageJson.dependencies.redis;
  
  if (hasBull || hasRedis) {
    test('Bull queue installed', !!hasBull);
    test('Redis client installed', !!hasRedis);
    test('EMAIL_QUEUE_ENABLED set', process.env.EMAIL_QUEUE_ENABLED === 'true');
    
    if (process.env.EMAIL_QUEUE_ENABLED === 'true') {
      test('REDIS_HOST configured', !!process.env.REDIS_HOST, process.env.REDIS_HOST || '');
    }
  } else {
    log.info('Queue system not installed (optional)');
    log.info('To enable: npm install bull redis');
  }

  log.section('6. Connection Test (Optional)');

  // Test 12: Try to initialize service
  if (EmailService && process.env.EMAIL_PROVIDER) {
    try {
      log.info('Testing email service connection...');
      const status = await EmailService.testConnection();
      test('Email service connection successful', true, `Provider: ${status.provider}`);
    } catch (error) {
      test('Email service connection successful', false, error.message);
      log.warn('Connection failed - check your credentials');
    }
  } else {
    log.warn('Skipping connection test - service not configured');
  }

  // Summary
  log.section('Test Summary');

  console.log(`${colors.blue}Total Tests:${colors.reset}    ${testsRun}`);
  console.log(`${colors.green}Passed:${colors.reset}         ${testsPassed}`);
  console.log(`${colors.red}Failed:${colors.reset}         ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}✅ All tests passed! Email service is ready.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Review the issues above.${colors.reset}\n`);
  }

  // Recommendations
  if (testsFailed > 0) {
    console.log(`${colors.cyan}📝 Recommendations:${colors.reset}\n`);
    
    if (!process.env.EMAIL_PROVIDER) {
      console.log(`${colors.gray}1. Run: npm run cli -- setup-email${colors.reset}`);
    }
    
    if (!fs.existsSync(path.join(process.cwd(), 'services', 'EmailService.js'))) {
      console.log(`${colors.gray}2. Make sure EmailService.js is in services/ directory${colors.reset}`);
    }
    
    console.log(`${colors.gray}3. Check .env file for missing configuration${colors.reset}`);
    console.log(`${colors.gray}4. Verify your email provider credentials${colors.reset}\n`);
  } else {
    console.log(`${colors.cyan}🚀 Next Steps:${colors.reset}\n`);
    console.log(`${colors.gray}1. Send a test email to verify delivery${colors.reset}`);
    console.log(`${colors.gray}2. Integrate with your authentication flow${colors.reset}`);
    console.log(`${colors.gray}3. Customize email templates in templates/emails/${colors.reset}`);
    console.log(`${colors.gray}4. Consider enabling queue for better performance${colors.reset}\n`);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log.error(`Test suite crashed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});