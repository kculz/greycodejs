# 🔒 GreyCodeJS Security Setup

## Overview

GreyCodeJS includes comprehensive security middleware to protect your application from common web vulnerabilities.

---

## 🚀 Quick Setup

```bash
npm run cli -- setup-security
```

The interactive wizard will guide you through configuring:
- ✅ CORS (Cross-Origin Resource Sharing)
- ✅ Helmet (Security Headers)
- ✅ Rate Limiting
- ✅ Input Sanitization
- ✅ XSS Protection
- ✅ NoSQL Injection Prevention

---

## 🛡️ Security Features

### 1. **CORS Protection**
Controls which domains can access your API.

**Configuration:**
```env
CORS_ORIGIN=https://yourdomain.com
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_CREDENTIALS=true
```

**Multiple origins:**
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

**Development:**
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 2. **Helmet - Security Headers**
Sets various HTTP headers to protect against common attacks.

**Headers set by Helmet:**
- `Content-Security-Policy` - Prevents XSS attacks
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-Frame-Options` - Prevents clickjacking
- `Strict-Transport-Security` - Enforces HTTPS
- `X-XSS-Protection` - Browser XSS protection
- And many more...

### 3. **Rate Limiting**
Prevents brute force and DDoS attacks.

**Global rate limiter:**
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # 100 requests per window
```

**Per-route rate limiting:**
```javascript
const { configureRateLimiting } = require('../middlewares/security');
const { authLimiter } = configureRateLimiting();

// Apply stricter limits to auth routes
router.post('/login', authLimiter, AuthController.login);
router.post('/register', authLimiter, AuthController.register);
```

**Available limiters:**
- `apiLimiter` - General API (100 req/15min)
- `authLimiter` - Authentication (5 req/15min)
- `passwordResetLimiter` - Password reset (3 req/hour)

### 4. **Input Sanitization**

**NoSQL Injection Prevention:**
```javascript
// Blocks malicious queries like:
{ "email": { "$gt": "" } }

// Sanitized to:
{ "email": "_gt_": "" }
```

**XSS Prevention:**
```javascript
// Blocks malicious input like:
<script>alert('XSS')</script>

// Sanitized to safe string
```

**HTTP Parameter Pollution:**
```javascript
// Prevents duplicate parameters
?sort=name&sort=email  // Only first used

// Whitelist allowed arrays:
hpp({ whitelist: ['sort', 'fields', 'filter'] })
```

### 5. **Security Logging**
Automatically logs suspicious requests:
- Path traversal attempts
- SQL injection patterns
- XSS attempts
- Template injection

### 6. **IP Filtering (Optional)**

**Whitelist only:**
```env
IP_WHITELIST=127.0.0.1,::1,192.168.1.100
```

**Blacklist specific IPs:**
```env
IP_BLACKLIST=123.456.789.0,111.222.333.444
```

---

## 📦 Dependencies

The security system uses these packages:

```json
{
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "express-mongo-sanitize": "^2.2.0",
  "xss-clean": "^0.1.4",
  "hpp": "^0.2.3",
  "cors": "^2.8.5"
}
```

---

## 🔧 Manual Integration

If you prefer manual setup:

### 1. Install dependencies
```bash
npm install helmet express-rate-limit express-mongo-sanitize xss-clean hpp
```

### 2. Create security middleware
```javascript
// middlewares/security.js
const { applySecurityMiddleware } = require('./security');

// In your app.js
applySecurityMiddleware(app);
```

### 3. Configure environment
```env
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🎯 Usage Examples

### Protect Specific Routes

```javascript
const { configureRateLimiting } = require('../middlewares/security');
const { authLimiter, apiLimiter } = configureRateLimiting();

// Apply to all routes
app.use('/api', apiLimiter);

// Stricter for auth
router.post('/auth/login', authLimiter, login);
router.post('/auth/register', authLimiter, register);
```

### Custom Rate Limiter

```javascript
const rateLimit = require('express-rate-limit');

const customLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests
  message: 'Too many requests, please slow down'
});

router.post('/expensive-operation', customLimiter, handler);
```

### Bypass Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user && req.user.role === 'admin';
  }
});
```

---

## 🧪 Testing Security

### 1. Run Test Suite
```bash
node scripts/test-security.js
```

### 2. Test Rate Limiting
```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl http://localhost:3000/api/endpoint
done
```

### 3. Test CORS
```bash
# Should be blocked if origin not allowed
curl -H "Origin: https://evil.com" \
  http://localhost:3000/api/endpoint
```

### 4. Test Input Sanitization
```bash
# Try NoSQL injection
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":"test"}'

# Should be sanitized and fail authentication
```

---

## 🚨 Security Checklist

### Development
- [ ] CORS allows localhost origins
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Input sanitization active
- [ ] Security logging working

### Production
- [ ] CORS set to specific domains (not *)
- [ ] HTTPS enforced
- [ ] Strict rate limits
- [ ] All security features enabled
- [ ] IP whitelist configured (if needed)
- [ ] Security monitoring set up
- [ ] Regular security audits scheduled

---

## 📊 Monitoring Security Events

Security middleware logs various events:

```javascript
// View security logs
tail -f logs/combined.log | grep -i "security\|suspicious\|rate limit"
```

**What gets logged:**
- ❌ Blocked CORS requests
- ⏱️ Rate limit exceeded
- 🚨 Suspicious request patterns
- 🛡️ NoSQL injection attempts
- 🔒 IP filtering events

---

## 🔒 Best Practices

### 1. **Always Use HTTPS in Production**
```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 2. **Set Appropriate Rate Limits**
- Public endpoints: 100 req/15min
- Authentication: 5 req/15min
- Password reset: 3 req/hour
- API key endpoints: 1000 req/hour

### 3. **Keep Dependencies Updated**
```bash
npm audit
npm audit fix
npm outdated
```

### 4. **Monitor Security Logs**
Set up alerts for:
- Multiple rate limit violations
- Suspicious request patterns
- Failed authentication attempts
- CORS violations

### 5. **Regular Security Reviews**
- Weekly: Review security logs
- Monthly: Update dependencies
- Quarterly: Security audit
- Yearly: Penetration testing

---

## 🆘 Troubleshooting

### CORS Errors
**Problem:** "Access blocked by CORS policy"

**Solution:**
```env
# Check CORS_ORIGIN in .env
CORS_ORIGIN=https://yourfrontend.com

# For multiple origins
CORS_ORIGIN=https://app1.com,https://app2.com

# Development
CORS_ORIGIN=http://localhost:3000
```

### Rate Limit Issues
**Problem:** Legitimate users being rate limited

**Solution:**
```env
# Increase limits
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000

# Or implement user-specific rate limiting
```

### False Positive Security Alerts
**Problem:** Legitimate requests flagged as suspicious

**Solution:**
```javascript
// Adjust patterns in securityLogger middleware
// Or whitelist specific routes
```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## ✅ Quick Reference

```bash
# Setup security
npm run cli -- setup-security

# Test security
node scripts/test-security.js

# View security logs
tail -f logs/combined.log | grep security

# Update dependencies
npm audit fix
```

---

**Stay Secure! 🔒**

Generated by GreyCodeJS CLI