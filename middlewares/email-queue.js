// middlewares/email-queue.js
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

      logger.debug(`Processing email job: ${type}`, { jobId: job.id });

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
            throw new Error(`Unknown email job type: ${type}`);
        }

        logger.info(`Email job completed: ${type}`, { jobId: job.id });
        return result;
      } catch (error) {
        logger.error(`Email job failed: ${type}`, { jobId: job.id, error: error.message });
        throw error;
      }
    });

    // Queue event handlers
    emailQueue.on('completed', (job, result) => {
      logger.debug(`Email job ${job.id} completed`, { result });
    });

    emailQueue.on('failed', (job, error) => {
      logger.error(`Email job ${job.id} failed`, { 
        error: error.message,
        attempts: job.attemptsMade,
        data: job.data 
      });
    });

    emailQueue.on('stalled', (job) => {
      logger.warn(`Email job ${job.id} stalled`);
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
        throw new Error(`Unknown email type: ${type}`);
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

    logger.debug(`Email queued: ${type}`, { jobId: job.id });
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