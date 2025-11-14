# Email Service Setup Guide

## 🎉 Welcome to GreyCodeJS Email Service

This guide will help you set up and use the email service in your GreyCodeJS application.

---

## 📦 Quick Start

### 1. Setup Email Service

```bash
npm run cli -- setup-email
```

This interactive wizard will:
- Install required dependencies
- Configure your email provider
- Create email templates
- Test your configuration

### 2. Choose Your Provider

- **SMTP** - Works with any SMTP server (Gmail, Mailtrap, Mailhog, etc.)
- **SendGrid** - Cloud-based email service
- **AWS SES** - Amazon's Simple Email Service
- **Mailgun** - Transactional email API

---

## 🔧 Manual Configuration

### SMTP Configuration

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Your App Name

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=false
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASSWORD`

**Development (Mailtrap):**
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password
```

### SendGrid Configuration

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourapp.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
```

### AWS SES Configuration

```env
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@yourapp.com
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
```

### Mailgun Configuration

```env
EMAIL_PROVIDER=mailgun
EMAIL_FROM=noreply@yourapp.com
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
```

---

## 📧 Sending Emails

### Basic Usage

```javascript
const EmailService = require('./services/EmailService');

// Simple email
await EmailService.send({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<h1>Welcome</h1><p>Thank you for signing up.</p>'
});

// With text alternative
await EmailService.send({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<h1>Welcome</h1>',
  text: 'Welcome! Thank you for signing up.'
});
```

### Using Templates

```javascript
// Send using a template
await EmailService.sendTemplate({
  to: 'user@example.com',
  subject: 'Welcome to Our App',
  template: 'welcome',
  data: {
    userName: 'John Doe',
    loginUrl: 'https://yourapp.com/login'
  }
});
```

### Pre-built Email Functions

```javascript
// Welcome email
await EmailService.sendWelcomeEmail(user);

// Password reset
await EmailService.sendPasswordResetEmail(user, resetToken);

// Email verification
await EmailService.sendVerificationEmail(user, verificationToken);
```

### Advanced Options

```javascript
await EmailService.send({
  to: 'user@example.com',
  subject: 'Your Order',
  html: '<p>Order confirmed!</p>',
  cc: 'manager@example.com',
  bcc: 'archive@example.com',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf'
    }
  ]
});
```

---

## 🎨 Email Templates

### Template Structure

Templates are stored in `templates/emails/` and use EJS syntax.

**Example: welcome.ejs**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to <%= appName %></title>
</head>
<body>
  <h1>Welcome <%= userName %>!</h1>
  <p>Thanks for joining <%= appName %>.</p>
  <a href="<%= loginUrl %>">Login Now</a>
  
  <footer>
    &copy; <%= year %> <%= appName %>
  </footer>
</body>
</html>
```

### Available Variables

All templates have access to:

- `appName` - Your application name
- `appUrl` - Your application URL
- `year` - Current year
- Any custom data you pass

### Creating Custom Templates

1. Create a new `.ejs` file in `templates/emails/`
2. Use the template in your code:

```javascript
await EmailService.sendTemplate({
  to: 'user@example.com',
  subject: 'Custom Email',
  template: 'my-custom-template',
  data: {
    customVar: 'Custom Value'
  }
});
```

---

## 🚀 Background Processing (Queue)

For better performance, queue emails to send them in the background.

### Setup

```bash
# Install Redis
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server

# Install Bull queue
npm install bull redis
```

### Configuration

```env
EMAIL_QUEUE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Usage

```javascript
const EmailQueue = require('./middlewares/email-queue');

// Queue emails instead of sending immediately
await EmailQueue.sendWelcomeEmail(user);

// With priority (lower number = higher priority)
await EmailQueue.sendPasswordResetEmail(user, token, {
  priority: 1
});

// Delayed send (in milliseconds)
await EmailQueue.send({
  to: 'user@example.com',
  subject: 'Reminder',
  html: '<p>Don\'t forget!</p>'
}, {
  delay: 3600000 // 1 hour
});
```

### Queue Management

```javascript
// Get queue statistics
const stats = await EmailQueue.getStats();
console.log(stats);
// { waiting: 5, active: 2, completed: 100, failed: 1 }

// Clean old jobs
await EmailQueue.clean(); // Removes jobs older than 1 hour

// Pause/Resume
await EmailQueue.pause();
await EmailQueue.resume();
```

---

## 🔗 Integration Examples

### With Authentication

```javascript
// controllers/AuthController.js
const EmailService = require('../services/EmailService');

const register = async (req, res) => {
  try {
    const user = await User.create(req.body);
    
    // Send welcome email
    await EmailService.sendWelcomeEmail(user);
    
    return res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
```

### Password Reset Flow

```javascript
// controllers/AuthController.js
const crypto = require('crypto');

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Save token to user (with expiry)
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Send reset email
    await EmailService.sendPasswordResetEmail(user, resetToken);
    
    return res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
```

### Email Verification

```javascript
const register = async (req, res) => {
  try {
    const user = await User.create({
      ...req.body,
      emailVerified: false
    });
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();
    
    // Send verification email
    await EmailService.sendVerificationEmail(user, verificationToken);
    
    return res.status(201).json({
      success: true,
      message: 'Please check your email to verify your account'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    
    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
```

---

## 🧪 Testing

### Test Email Service

```bash
# Use the CLI to test
npm run cli -- setup-email --skip-install

# Or programmatically
node -e "
const EmailService = require('./services/EmailService');
EmailService.send({
  to: 'test@example.com',
  subject: 'Test',
  html: '<h1>Test Email</h1>'
}).then(() => console.log('Sent!')).catch(console.error);
"
```

### Development Mode

```env
# Log emails instead of sending
EMAIL_LOG_ONLY=true

# Override recipient in development
EMAIL_OVERRIDE_RECIPIENT=developer@example.com
```

---

## 📊 Monitoring

### Log Email Activity

```javascript
// All email activity is logged automatically
// Check logs/combined.log for email events
```

### Health Check Endpoint

```javascript
// routes/health.js
router.get('/health/email', async (req, res) => {
  try {
    const EmailService = require('../services/EmailService');
    const status = await EmailService.testConnection();
    
    return res.json({
      status: 'healthy',
      ...status
    });
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## 🔒 Security Best Practices

1. **Never commit credentials**
   - Keep `.env` in `.gitignore`
   - Use environment variables in production

2. **Rate limiting**
   - Implement rate limits on email endpoints
   - Prevent spam and abuse

3. **Validate email addresses**
   - Use proper email validation
   - Verify email ownership

4. **Use authenticated SMTP**
   - Always use authentication
   - Enable TLS/SSL

5. **Monitor bounces**
   - Track failed deliveries
   - Clean invalid addresses

---

## 🐛 Troubleshooting

### Connection Refused

```
Error: Connection timeout
```

**Solutions:**
- Check SMTP host and port
- Verify firewall settings
- Try port 587 (TLS) or 465 (SSL)

### Authentication Failed

```
Error: Invalid login
```

**Solutions:**
- Check username and password
- For Gmail, use App Password
- Enable "Less secure apps" or use OAuth2

### Emails Not Arriving

**Check:**
1. Spam folder
2. Email logs: `logs/combined.log`
3. Provider dashboard (SendGrid, Mailgun, etc.)
4. DNS/SPF records for your domain

### Queue Not Working

```
Error: Redis connection failed
```

**Solutions:**
- Start Redis: `redis-server`
- Check Redis port: `redis-cli ping`
- Verify `REDIS_HOST` and `REDIS_PORT`

---

## 📚 API Reference

### EmailService Methods

```javascript
// Initialize
await EmailService.initialize()

// Send email
await EmailService.send(options)

// Send templated email
await EmailService.sendTemplate(options)

// Render template
const html = await EmailService.renderTemplate(name, data)

// Pre-built emails
await EmailService.sendWelcomeEmail(user)
await EmailService.sendPasswordResetEmail(user, token)
await EmailService.sendVerificationEmail(user, token)

// With retry
await EmailService.sendWithRetry(options, maxRetries)

// Test connection
await EmailService.testConnection()

// Get status
const status = EmailService.getStatus()
```

### EmailQueue Methods

```javascript
// Queue emails
await EmailQueue.send(options)
await EmailQueue.sendTemplate(options)
await EmailQueue.sendWelcomeEmail(user)
await EmailQueue.sendPasswordResetEmail(user, token)
await EmailQueue.sendVerificationEmail(user, token)

// Queue management
await EmailQueue.getStats()
await EmailQueue.clean()
await EmailQueue.pause()
await EmailQueue.resume()
await EmailQueue.close()
```

---

## 💡 Tips & Best Practices

1. **Use queues in production** - Improves response times
2. **Design mobile-friendly emails** - Use responsive templates
3. **Include text alternatives** - Better deliverability
4. **Test across email clients** - Use services like Litmus
5. **Track open rates** - Use tracking pixels (optional)
6. **Provide unsubscribe links** - Legal requirement in many countries
7. **Keep it simple** - Complex HTML may not render properly
8. **Use transactional emails wisely** - Don't spam users

---

## 🔗 Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid Docs](https://docs.sendgrid.com/)
- [AWS SES Guide](https://aws.amazon.com/ses/)
- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Email Template Best Practices](https://mailchimp.com/email-design-guide/)

---

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review logs in `logs/combined.log`
3. Test configuration: `npm run cli -- setup-email`
4. Open an issue on GitHub

---

**Generated by GreyCodeJS CLI**
