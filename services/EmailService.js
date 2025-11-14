// services/EmailService.js
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * EmailService
 * Handles email sending with support for multiple providers
 * Supports: SMTP, SendGrid, AWS SES, Mailgun
 */
class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp';
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
          throw new Error(`Unsupported email provider: ${this.provider}`);
      }

      this.initialized = true;
      logger.info(`Email service initialized with provider: ${this.provider}`);
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Initialize SMTP transport
   */
  async initializeSMTP() {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

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
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.transporter = sgMail;
    logger.debug('SendGrid initialized');
  }

  /**
   * Initialize AWS SES
   */
  async initializeAWS() {
    const aws = require('aws-sdk');

    aws.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.transporter = new aws.SES({ apiVersion: '2010-12-01' });
    logger.debug('AWS SES initialized');
  }

  /**
   * Initialize Mailgun
   */
  async initializeMailgun() {
    const mailgun = require('mailgun-js');

    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN required');
    }

    this.transporter = mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN
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

    try {
      const emailData = {
        from: options.from || process.env.EMAIL_FROM || 'noreply@yourapp.com',
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

      logger.info(`Email sent successfully to ${emailData.to}`);
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
    const templatePath = path.join(this.templatesPath, `${templateName}.ejs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templateName}`);
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
      logger.error(`Failed to render email template ${templateName}:`, error);
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
        loginUrl: `${process.env.APP_URL || 'http://localhost:3000'}/login`
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

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
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

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
        logger.warn(`Email send attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
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