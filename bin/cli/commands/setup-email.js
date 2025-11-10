const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Register setup-email command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('setup-email')
    .description('Set up email service for your application')
    .option('--skip-install', 'Skip npm package installation')
    .option('--provider <provider>', 'Email provider (smtp, sendgrid, ses, mailgun)')
    .option('--test-email <email>', 'Send test email after setup')
    .action(async (options) => {
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║           GreyCodeJS Email Setup Wizard                   ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

      try {
        let filesCreated = 0;
        let dependenciesInstalled = 0;

        // Step 1: Install dependencies
        console.log(chalk.blue('📦 [1/6] Checking dependencies...\n'));
        
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        let packageJson = {};
        
        if (fs.existsSync(packageJsonPath)) {
          packageJson = require(packageJsonPath);
        }

        const requiredDeps = {
          'nodemailer': 'Email sending library',
          'ejs': 'Template engine for email templates'
        };

        const providerDeps = {
          'sendgrid': '@sendgrid/mail',
          'mailgun': 'mailgun-js',
          'ses': 'aws-sdk'
        };

        const missingDeps = [];
        for (const [dep, desc] of Object.entries(requiredDeps)) {
          if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
            missingDeps.push({ dep, desc });
          }
        }

        if (missingDeps.length > 0) {
          if (options.skipInstall) {
            console.log(chalk.yellow('⚠️  Missing dependencies:'));
            missingDeps.forEach(({ dep, desc }) => {
              console.log(chalk.yellow(`   - ${dep}: ${desc}`));
            });
            console.log(chalk.yellow('\n   Please run: npm install nodemailer ejs\n'));
          } else {
            console.log(chalk.blue('Installing dependencies...\n'));
            try {
              const depsToInstall = missingDeps.map(({ dep }) => dep).join(' ');
              execSync(`npm install ${depsToInstall}`, { stdio: 'inherit' });
              dependenciesInstalled += missingDeps.length;
              console.log(chalk.green('\n✅ Dependencies installed successfully\n'));
            } catch (error) {
              console.log(chalk.red('❌ Failed to install dependencies'));
              console.log(chalk.yellow('Please run manually: npm install nodemailer ejs\n'));
            }
          }
        } else {
          console.log(chalk.green('✅ All core dependencies installed\n'));
        }

        // Step 2: Determine email provider
        console.log(chalk.blue('🔧 [2/6] Configuring email provider...\n'));
        
        let provider = options.provider;
        if (!provider) {
          provider = await askProvider();
        }

        // Step 3: Create email configuration
        console.log(chalk.blue('⚙️  [3/6] Creating email configuration...\n'));
        
        const configDir = path.join(process.cwd(), 'config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        const emailConfigPath = path.join(configDir, 'email.js');
        if (!fs.existsSync(emailConfigPath)) {
          const emailConfigContent = getEmailConfigContent(provider);
          fs.writeFileSync(emailConfigPath, emailConfigContent);
          console.log(chalk.green('   ✅ Created: config/email.js'));
          filesCreated++;
        } else {
          console.log(chalk.yellow('   ⚠️  config/email.js already exists, skipping'));
        }

        // Step 4: Create email service
        console.log(chalk.blue('📧 [4/6] Creating email service...\n'));
        
        const servicesDir = path.join(process.cwd(), 'services');
        if (!fs.existsSync(servicesDir)) {
          fs.mkdirSync(servicesDir, { recursive: true });
        }

        const emailServicePath = path.join(servicesDir, 'EmailService.js');
        if (!fs.existsSync(emailServicePath)) {
          const emailServiceContent = getEmailServiceContent();
          fs.writeFileSync(emailServicePath, emailServiceContent);
          console.log(chalk.green('   ✅ Created: services/EmailService.js'));
          filesCreated++;
        } else {
          console.log(chalk.yellow('   ⚠️  services/EmailService.js already exists, skipping'));
        }

        // Step 5: Create email templates
        console.log(chalk.blue('🎨 [5/6] Creating email templates...\n'));
        
        const templatesDir = path.join(process.cwd(), 'templates', 'emails');
        if (!fs.existsSync(templatesDir)) {
          fs.mkdirSync(templatesDir, { recursive: true });
          console.log(chalk.green('   ✅ Created: templates/emails/'));
          filesCreated++;
        } else {
          console.log(chalk.green('   ✅ templates/emails/ directory exists'));
        }

        // Create template files
        const templates = {
          'welcome.ejs': getWelcomeTemplate(),
          'password-reset.ejs': getPasswordResetTemplate(),
          'email-verification.ejs': getEmailVerificationTemplate()
        };

        for (const [filename, content] of Object.entries(templates)) {
          const templatePath = path.join(templatesDir, filename);
          if (!fs.existsSync(templatePath)) {
            fs.writeFileSync(templatePath, content);
            console.log(chalk.green(`   ✅ Created: templates/emails/${filename}`));
            filesCreated++;
          } else {
            console.log(chalk.yellow(`   ⚠️  templates/emails/${filename} already exists, skipping`));
          }
        }

        // Step 6: Create email queue middleware
        console.log(chalk.blue('📨 [6/6] Creating email queue system...\n'));
        
        const middlewaresDir = path.join(process.cwd(), 'middlewares');
        if (!fs.existsSync(middlewaresDir)) {
          fs.mkdirSync(middlewaresDir, { recursive: true });
        }

        const emailQueuePath = path.join(middlewaresDir, 'email-queue.js');
        if (!fs.existsSync(emailQueuePath)) {
          const emailQueueContent = getEmailQueueContent();
          fs.writeFileSync(emailQueuePath, emailQueueContent);
          console.log(chalk.green('   ✅ Created: middlewares/email-queue.js'));
          filesCreated++;
        } else {
          console.log(chalk.yellow('   ⚠️  middlewares/email-queue.js already exists, skipping'));
        }

        // Step 7: Update environment variables
        console.log(chalk.blue('\n🔐 Updating environment configuration...\n'));
        
        await updateEnvFile(provider);

        // Success summary
        console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║               🎉 Email Setup Complete!                   ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n'));

        console.log(chalk.cyan('📊 Summary:'));
        console.log(chalk.gray(`   Files created: ${filesCreated}`));
        console.log(chalk.gray(`   Dependencies installed: ${dependenciesInstalled}`));
        console.log(chalk.gray(`   Provider: ${provider}\n`));

        console.log(chalk.cyan('📚 Files Created:\n'));
        console.log(chalk.white('   ✅ config/email.js - Email configuration'));
        console.log(chalk.white('   ✅ services/EmailService.js - Email service'));
        console.log(chalk.white('   ✅ middlewares/email-queue.js - Email queue system'));
        console.log(chalk.white('   ✅ templates/emails/ - Email templates directory'));
        console.log(chalk.white('   ✅ templates/emails/welcome.ejs - Welcome email template'));
        console.log(chalk.white('   ✅ templates/emails/password-reset.ejs - Password reset template'));
        console.log(chalk.white('   ✅ templates/emails/email-verification.ejs - Verification template\n'));

        console.log(chalk.cyan('🚀 Quick Start:\n'));
        
        console.log(chalk.white('1. Configure your .env file with email provider credentials:'));
        console.log(chalk.cyan('   nano .env\n'));

        console.log(chalk.white('2. Test your email configuration:'));
        console.log(chalk.cyan('   npm run cli -- test-email\n'));

        console.log(chalk.white('3. Use email service in your application:'));
        console.log(chalk.gray('   const EmailService = require(\'./services/EmailService\');'));
        console.log(chalk.gray('   await EmailService.sendWelcomeEmail(user);\n'));

        console.log(chalk.yellow('💡 Pro Tips:\n'));
        console.log(chalk.gray('   • Use email queues in production for better performance'));
        console.log(chalk.gray('   • Customize email templates in templates/emails/'));
        console.log(chalk.gray('   • Test email delivery with different providers'));
        console.log(chalk.gray('   • Monitor email logs for delivery issues\n'));

        console.log(chalk.cyan('🔧 Next Steps:\n'));
        console.log(chalk.white('1. Add to your .env file:'));
        showEnvInstructions(provider);
        console.log(chalk.white('\n2. Install provider-specific dependencies if needed:'));
        showProviderDeps(provider);

        // Test email if requested
        if (options.testEmail) {
          console.log(chalk.blue('\n🧪 Sending test email...\n'));
          await sendTestEmail(options.testEmail);
        }

      } catch (error) {
        console.error(chalk.red('\n❌ Email setup failed:'), error.message);
        if (process.env.NODE_ENV === 'development') {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
};

/**
 * Ask user for email provider
 */
function askProvider() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(chalk.cyan('Choose your email provider:'));
    console.log(chalk.white('1) SMTP (Gmail, Mailtrap, etc.)'));
    console.log(chalk.white('2) SendGrid'));
    console.log(chalk.white('3) AWS SES'));
    console.log(chalk.white('4) Mailgun'));
    console.log(chalk.gray('\nEnter choice (1-4):'));

    rl.question('> ', (answer) => {
      rl.close();
      const providers = ['smtp', 'sendgrid', 'ses', 'mailgun'];
      const choice = parseInt(answer) - 1;
      if (choice >= 0 && choice < providers.length) {
        resolve(providers[choice]);
      } else {
        console.log(chalk.yellow('⚠️  Invalid choice, defaulting to SMTP'));
        resolve('smtp');
      }
    });
  });
}

/**
 * Get email config content
 */
function getEmailConfigContent(provider) {
  return `// config/email.js

/**
 * Email Configuration
 * Supports multiple providers: SMTP, SendGrid, AWS SES, Mailgun
 */

module.exports = {
  // Email provider (smtp, sendgrid, ses, mailgun)
  provider: process.env.EMAIL_PROVIDER || '${provider}',

  // Default from address
  defaultFrom: process.env.EMAIL_FROM || 'noreply@yourapp.com',
  defaultFromName: process.env.EMAIL_FROM_NAME || 'Your App Name',

  // Queue configuration
  queue: {
    enabled: process.env.EMAIL_QUEUE_ENABLED === 'true',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    max: 100, // max emails per hour
    windowMs: 60 * 60 * 1000 // 1 hour
  },

  // Development settings
  development: {
    logOnly: process.env.EMAIL_LOG_ONLY === 'true',
    overrideRecipient: process.env.EMAIL_OVERRIDE_RECIPIENT
  },

  // Provider-specific configurations
  providers: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY
    },
    ses: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN
    }
  }
};
`;
}

/**
 * Get email service content
 */
function getEmailServiceContent() {
  return `// services/EmailService.js
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const emailConfig = require('../config/email');

/**
 * EmailService
 * Handles email sending with support for multiple providers
 * Supports: SMTP, SendGrid, AWS SES, Mailgun
 */
class EmailService {
  constructor() {
    this.provider = emailConfig.provider;
    this.transporter = null;
    this.templatesPath = path.join(process.cwd(), 'templates', 'emails');
    this.initialized = false;
  }

  /**
   * Initialize email service based on provider
   */
  async initialize() {
    if (this.initialized) return;

    try {
      switch (this.provider.toLowerCase()) {
        case 'smtp':
          await this.initializeSMTP();
          break;
        case 'sendgrid':
          await this.initializeSendGrid();
          break;
        case 'ses':
          await this.initializeAWS();
          break;
        case 'mailgun':
          await this.initializeMailgun();
          break;
        default:
          throw new Error(\`Unsupported email provider: \${this.provider}\`);
      }

      this.initialized = true;
      logger.info(\`Email service initialized with provider: \${this.provider}\`);
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Initialize SMTP transport
   */
  async initializeSMTP() {
    const config = emailConfig.providers.smtp;

    // Validate required config
    if (!config.host || !config.auth.user || !config.auth.pass) {
      throw new Error('SMTP configuration incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }

    this.transporter = nodemailer.createTransport(config);

    // Verify connection
    await this.transporter.verify();
    logger.debug('SMTP connection verified');
  }

  /**
   * Initialize SendGrid
   */
  async initializeSendGrid() {
    const sgMail = require('@sendgrid/mail');
    const config = emailConfig.providers.sendgrid;
    
    if (!config.apiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    sgMail.setApiKey(config.apiKey);
    this.transporter = sgMail;
    logger.debug('SendGrid initialized');
  }

  /**
   * Initialize AWS SES
   */
  async initializeAWS() {
    const aws = require('aws-sdk');
    const config = emailConfig.providers.ses;

    aws.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });

    this.transporter = new aws.SES({ apiVersion: '2010-12-01' });
    logger.debug('AWS SES initialized');
  }

  /**
   * Initialize Mailgun
   */
  async initializeMailgun() {
    const mailgun = require('mailgun-js');
    const config = emailConfig.providers.mailgun;

    if (!config.apiKey || !config.domain) {
      throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN required');
    }

    this.transporter = mailgun({
      apiKey: config.apiKey,
      domain: config.domain
    });
    logger.debug('Mailgun initialized');
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise}
   */
  async send(options) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Development mode: log only or override recipient
    if (emailConfig.development.logOnly) {
      logger.info('EMAIL LOG ONLY - Would send email:', {
        to: options.to,
        subject: options.subject,
        provider: this.provider
      });
      return { success: true, logged: true, provider: this.provider };
    }

    if (emailConfig.development.overrideRecipient) {
      logger.warn(\`Email recipient overridden: \${options.to} -> \${emailConfig.development.overrideRecipient}\`);
      options.to = emailConfig.development.overrideRecipient;
    }

    try {
      const emailData = {
        from: options.from || emailConfig.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments
      };

      // Validate required fields
      if (!emailData.to || !emailData.subject || (!emailData.html && !emailData.text)) {
        throw new Error('Email requires: to, subject, and html or text');
      }

      let result;

      switch (this.provider.toLowerCase()) {
        case 'smtp':
          result = await this.transporter.sendMail(emailData);
          break;
        case 'sendgrid':
          result = await this.transporter.send(emailData);
          break;
        case 'ses':
          result = await this.sendViaSES(emailData);
          break;
        case 'mailgun':
          result = await this.transporter.messages().send(emailData);
          break;
      }

      logger.info(\`Email sent successfully to \${emailData.to}\`);
      return {
        success: true,
        messageId: result.messageId || result[0]?.statusCode,
        provider: this.provider
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send via AWS SES
   */
  async sendViaSES(emailData) {
    const params = {
      Source: emailData.from,
      Destination: {
        ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to]
      },
      Message: {
        Subject: { Data: emailData.subject },
        Body: {
          Html: { Data: emailData.html },
          Text: { Data: emailData.text || '' }
        }
      }
    };

    if (emailData.cc) {
      params.Destination.CcAddresses = Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc];
    }

    if (emailData.bcc) {
      params.Destination.BccAddresses = Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc];
    }

    return await this.transporter.sendEmail(params).promise();
  }

  /**
   * Render email template
   * @param {string} templateName - Template file name (without .ejs)
   * @param {Object} data - Template data
   * @returns {Promise<string>}
   */
  async renderTemplate(templateName, data = {}) {
    const templatePath = path.join(this.templatesPath, \`\${templateName}.ejs\`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(\`Email template not found: \${templateName}\`);
    }

    try {
      const html = await ejs.renderFile(templatePath, {
        ...data,
        appName: process.env.APP_NAME || 'GreyCodeJS App',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        year: new Date().getFullYear()
      });

      return html;
    } catch (error) {
      logger.error(\`Failed to render email template \${templateName}:\`, error);
      throw error;
    }
  }

  /**
   * Send templated email
   * @param {Object} options
   */
  async sendTemplate(options) {
    const html = await this.renderTemplate(options.template, options.data);

    return await this.send({
      to: options.to,
      subject: options.subject,
      html,
      from: options.from,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    return await this.sendTemplate({
      to: user.email,
      subject: 'Welcome to ' + (process.env.APP_NAME || 'GreyCodeJS'),
      template: 'welcome',
      data: {
        userName: user.username || user.name || user.email.split('@')[0],
        loginUrl: \`\${process.env.APP_URL || 'http://localhost:3000'}/login\`
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = \`\${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=\${resetToken}\`;

    return await this.sendTemplate({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        userName: user.username || user.name || user.email.split('@')[0],
        resetUrl,
        expiresIn: '1 hour'
      }
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = \`\${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=\${verificationToken}\`;

    return await this.sendTemplate({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      data: {
        userName: user.username || user.name || user.email.split('@')[0],
        verificationUrl
      }
    });
  }

  /**
   * Send custom email with retry logic
   */
  async sendWithRetry(options, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.send(options);
      } catch (error) {
        lastError = error;
        logger.warn(\`Email send attempt \${attempt} failed:\`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(\`Failed to send email after \${maxRetries} attempts: \${lastError.message}\`);
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (this.provider === 'smtp') {
        await this.transporter.verify();
      }

      logger.info('Email service test successful');
      return { success: true, provider: this.provider };
    } catch (error) {
      logger.error('Email service test failed:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      provider: this.provider,
      templatesPath: this.templatesPath,
      templatesExist: fs.existsSync(this.templatesPath)
    };
  }
}

// Export singleton instance
module.exports = new EmailService();
`;
}

/**
 * Get email queue content
 */
function getEmailQueueContent() {
  return `// middlewares/email-queue.js
const Bull = require('bull');
const logger = require('../utils/logger');
const emailConfig = require('../config/email');

/**
 * Email Queue System
 * Handles background email processing with Bull queue
 */

let emailQueue = null;
let isInitialized = false;

/**
 * Initialize email queue
 */
function initializeQueue() {
  if (isInitialized) {
    return emailQueue;
  }

  if (!emailConfig.queue.enabled) {
    logger.info('Email queue is disabled, emails will be sent synchronously');
    return null;
  }

  try {
    emailQueue = new Bull('email-queue', {
      redis: emailConfig.queue.redis,
      defaultJobOptions: {
        attempts: emailConfig.queue.attempts,
        backoff: emailConfig.queue.backoff,
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    // Process email jobs
    emailQueue.process(async (job) => {
      const { type, data } = job.data;
      const EmailService = require('../services/EmailService');

      logger.debug(\`Processing email job: \${type}\`, { jobId: job.id });

      try {
        let result;

        switch (type) {
          case 'send':
            result = await EmailService.send(data);
            break;
          case 'sendTemplate':
            result = await EmailService.sendTemplate(data);
            break;
          case 'sendWelcome':
            result = await EmailService.sendWelcomeEmail(data.user);
            break;
          case 'sendPasswordReset':
            result = await EmailService.sendPasswordResetEmail(data.user, data.resetToken);
            break;
          case 'sendVerification':
            result = await EmailService.sendVerificationEmail(data.user, data.verificationToken);
            break;
          default:
            throw new Error(\`Unknown email job type: \${type}\`);
        }

        logger.info(\`Email job completed: \${type}\`, { jobId: job.id });
        return result;
      } catch (error) {
        logger.error(\`Email job failed: \${type}\`, { jobId: job.id, error: error.message });
        throw error;
      }
    });

    // Queue event handlers
    emailQueue.on('completed', (job, result) => {
      logger.debug(\`Email job \${job.id} completed\`, { result });
    });

    emailQueue.on('failed', (job, error) => {
      logger.error(\`Email job \${job.id} failed\`, { 
        error: error.message,
        attempts: job.attemptsMade,
        data: job.data 
      });
    });

    emailQueue.on('stalled', (job) => {
      logger.warn(\`Email job \${job.id} stalled\`);
    });

    emailQueue.on('error', (error) => {
      logger.error('Email queue error:', error);
    });

    isInitialized = true;
    logger.info('Email queue initialized successfully');

    return emailQueue;
  } catch (error) {
    logger.error('Failed to initialize email queue:', error);
    return null;
  }
}

/**
 * Add email to queue
 */
async function queueEmail(type, data, options = {}) {
  const queue = initializeQueue();

  if (!queue) {
    // Queue not available, send synchronously
    logger.debug('Queue not available, sending email synchronously');
    const EmailService = require('../services/EmailService');

    switch (type) {
      case 'send':
        return await EmailService.send(data);
      case 'sendTemplate':
        return await EmailService.sendTemplate(data);
      case 'sendWelcome':
        return await EmailService.sendWelcomeEmail(data.user);
      case 'sendPasswordReset':
        return await EmailService.sendPasswordResetEmail(data.user, data.resetToken);
      case 'sendVerification':
        return await EmailService.sendVerificationEmail(data.user, data.verificationToken);
      default:
        throw new Error(\`Unknown email type: \${type}\`);
    }
  }

  try {
    const job = await queue.add(
      { type, data },
      {
        priority: options.priority || 10,
        delay: options.delay || 0,
        attempts: options.attempts || emailConfig.queue.attempts,
        removeOnComplete: options.removeOnComplete !== false,
        ...options
      }
    );

    logger.debug(\`Email queued: \${type}\`, { jobId: job.id });
    return { queued: true, jobId: job.id };
  } catch (error) {
    logger.error('Failed to queue email:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const queue = initializeQueue();

  if (!queue) {
    return { enabled: false };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return { enabled: true, error: error.message };
  }
}

/**
 * Clean completed jobs
 */
async function cleanQueue(grace = 3600000) {
  const queue = initializeQueue();

  if (!queue) {
    return { cleaned: 0 };
  }

  try {
    await queue.clean(grace, 'completed');
    await queue.clean(grace * 2, 'failed');
    
    logger.info('Queue cleaned successfully');
    return { cleaned: true };
  } catch (error) {
    logger.error('Failed to clean queue:', error);
    throw error;
  }
}

/**
 * Pause queue processing
 */
async function pauseQueue() {
  const queue = initializeQueue();

  if (queue) {
    await queue.pause();
    logger.info('Queue paused');
  }
}

/**
 * Resume queue processing
 */
async function resumeQueue() {
  const queue = initializeQueue();

  if (queue) {
    await queue.resume();
    logger.info('Queue resumed');
  }
}

/**
 * Close queue connection
 */
async function closeQueue() {
  if (emailQueue) {
    await emailQueue.close();
    isInitialized = false;
    logger.info('Queue closed');
  }
}

/**
 * Helper functions for common email types
 */
const EmailQueue = {
  /**
   * Queue a custom email
   */
  send: async (options) => {
    return await queueEmail('send', options);
  },

  /**
   * Queue a templated email
   */
  sendTemplate: async (options) => {
    return await queueEmail('sendTemplate', options);
  },

  /**
   * Queue welcome email
   */
  sendWelcomeEmail: async (user, options = {}) => {
    return await queueEmail('sendWelcome', { user }, options);
  },

  /**
   * Queue password reset email
   */
  sendPasswordResetEmail: async (user, resetToken, options = {}) => {
    return await queueEmail('sendPasswordReset', { user, resetToken }, options);
  },

  /**
   * Queue email verification
   */
  sendVerificationEmail: async (user, verificationToken, options = {}) => {
    return await queueEmail('sendVerification', { user, verificationToken }, options);
  },

  /**
   * Get queue statistics
   */
  getStats: getQueueStats,

  /**
   * Clean old jobs
   */
  clean: cleanQueue,

  /**
   * Pause processing
   */
  pause: pauseQueue,

  /**
   * Resume processing
   */
  resume: resumeQueue,

  /**
   * Close queue
   */
  close: closeQueue,

  /**
   * Initialize queue manually
   */
  initialize: initializeQueue
};

module.exports = EmailQueue;
`;
}

/**
 * Get welcome email template
 */
function getWelcomeTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to <%= appName %></title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to <%= appName %></h1>
    </div>
    <div class="content">
      <h2>Hello <%= userName %>,</h2>
      <p>Welcome to <%= appName %>! We're excited to have you on board.</p>
      <p>Your account has been successfully created and you can now access all the features of our platform.</p>
      
      <div style="text-align: center;">
        <a href="<%= loginUrl %>" class="button">Get Started</a>
      </div>

      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      
      <p>Best regards,<br>The <%= appName %> Team</p>
    </div>
    <div class="footer">
      <p>&copy; <%= year %> <%= appName %>. All rights reserved.</p>
      <p><a href="<%= appUrl %>" style="color: #667eea;">Visit our website</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get password reset template
 */
function getPasswordResetTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello <%= userName %>,</h2>
      <p>We received a request to reset your password for your <%= appName %> account.</p>
      
      <div style="text-align: center;">
        <a href="<%= resetUrl %>" class="button">Reset Password</a>
      </div>

      <div class="warning">
        <p><strong>Important:</strong> This password reset link will expire in <%= expiresIn %>. If you didn't request this reset, please ignore this email.</p>
      </div>

      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;"><%= resetUrl %></p>
      
      <p>Best regards,<br>The <%= appName %> Team</p>
    </div>
    <div class="footer">
      <p>&copy; <%= year %> <%= appName %>. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get email verification template
 */
function getEmailVerificationTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <h2>Hello <%= userName %>,</h2>
      <p>Thank you for signing up for <%= appName %>! To complete your registration, please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="<%= verificationUrl %>" class="button">Verify Email</a>
      </div>

      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;"><%= verificationUrl %></p>

      <p>If you didn't create an account with us, please ignore this email.</p>
      
      <p>Best regards,<br>The <%= appName %> Team</p>
    </div>
    <div class="footer">
      <p>&copy; <%= year %> <%= appName %>. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Update environment file with email configuration
 */
async function updateEnvFile(provider) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Remove existing email config
  const emailConfigRegex = /# Email Configuration.*?# End Email Configuration/s;
  envContent = envContent.replace(emailConfigRegex, '');

  const emailConfig = getEnvConfig(provider);
  
  if (!envContent.includes('# Email Configuration')) {
    envContent += `\n\n${emailConfig}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(chalk.green('   ✅ Updated: .env file with email configuration'));
}

/**
 * Get environment configuration for provider
 */
function getEnvConfig(provider) {
  const baseConfig = `# Email Configuration
EMAIL_PROVIDER=${provider}
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Your App Name
EMAIL_QUEUE_ENABLED=false
EMAIL_LOG_ONLY=false
# EMAIL_OVERRIDE_RECIPIENT=developer@example.com`;

  const providerConfigs = {
    smtp: `
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password`,
    
    sendgrid: `
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key`,
    
    ses: `
# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1`,
    
    mailgun: `
# Mailgun Configuration
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain`
  };

  return `${baseConfig}${providerConfigs[provider] || ''}\n# End Email Configuration`;
}

/**
 * Show environment instructions
 */
function showEnvInstructions(provider) {
  const instructions = {
    smtp: chalk.gray(`   EMAIL_PROVIDER=${provider}
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password`),
    
    sendgrid: chalk.gray(`   EMAIL_PROVIDER=${provider}
   SENDGRID_API_KEY=your-sendgrid-api-key`),
    
    ses: chalk.gray(`   EMAIL_PROVIDER=${provider}
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1`),
    
    mailgun: chalk.gray(`   EMAIL_PROVIDER=${provider}
   MAILGUN_API_KEY=your-api-key
   MAILGUN_DOMAIN=your-domain`)
  };

  console.log(instructions[provider]);
}

/**
 * Show provider dependencies
 */
function showProviderDeps(provider) {
  const deps = {
    sendgrid: chalk.cyan('   npm install @sendgrid/mail'),
    mailgun: chalk.cyan('   npm install mailgun-js'),
    ses: chalk.cyan('   npm install aws-sdk')
  };

  if (deps[provider]) {
    console.log(deps[provider]);
  } else {
    console.log(chalk.green('   ✅ No additional dependencies needed'));
  }
}

/**
 * Send test email
 */
async function sendTestEmail(testEmail) {
  try {
    // Dynamically require after setup
    const EmailService = require(path.join(process.cwd(), 'services', 'EmailService'));
    
    await EmailService.send({
      to: testEmail,
      subject: 'Test Email from GreyCodeJS',
      html: '<h1>Test Email</h1><p>This is a test email from your GreyCodeJS application.</p>'
    });
    
    console.log(chalk.green('   ✅ Test email sent successfully!'));
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  Could not send test email:'), error.message);
    console.log(chalk.gray('   Make sure to configure your email credentials in .env first'));
  }
}