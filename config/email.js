/**
 * Email Configuration
 * Supports multiple providers: SMTP, SendGrid, AWS SES, Mailgun
 */
module.exports = {
  // Email provider (smtp, sendgrid, ses, mailgun)
  provider: process.env.EMAIL_PROVIDER || 'smtp',

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