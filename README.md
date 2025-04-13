# GreyCodeJS Documentation

## Introduction

GreyCodeJS is a Node.js framework that provides an elegant, structured approach to building web applications. Built on top of Express.js, it simplifies common tasks while giving developers the flexibility to customize their application architecture.

## Core Concepts

### MVC Architecture

GreyCodeJS follows the Model-View-Controller (MVC) pattern:

- **Models**: Data structure and database operations
- **Views**: Presentation layer (templates)
- **Controllers**: Business logic and request handling

### Directory Structure

- **bin**: Contains CLI tools
- **config**: Configuration files for database, app settings
- **controllers**: Route controllers for handling requests
- **core**: Framework core files
- **middlewares**: Custom middleware functions
- **models**: Data models representing database tables
- **public/statics**: Static assets (CSS, JS, images)
- **routes**: Route definitions
- **seeds**: Database seed files
- **templates**: Templates for CLI code generation
- **views**: View templates for rendering HTML

## Getting Started

### Installation

```bash
npm install -g greycodejs-installer
greycodejs new my-project
cd my-project
npm run dev
```

### Configuration

1. Database setup in `config/database.js`
2. Environment variables in `.env` file
3. Application settings in `config/app.js` (if present)

## Database Operations

### Models

Models define your data structure and are stored in the `models` directory.

```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true
    }
  });
  
  return User;
};
```

### Migrations and Seeders

Use the CLI to create and run migrations:

```bash
npm run cli -- create-migration create_users_table
npm run cli -- migrate
```

Create seed data:

```bash
npm run cli -- create-seed users
npm run cli -- seed
```

## Routing

### Defining Routes

Create route files in the `routes` directory:

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.get('/', UserController.index);
router.get('/:id', UserController.show);
router.post('/', UserController.store);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.destroy);

module.exports = router;
```

### Route Registration

Register routes in `app.js`:

```javascript
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);
```

## Controllers

Create controller files in the `controllers` directory:

```javascript
// controllers/UserController.js
const { User } = require('../models');

module.exports = {
  async index(req, res) {
    try {
      const users = await User.findAll();
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
  
  async store(req, res) {
    try {
      const user = await User.create(req.body);
      return res.status(201).json(user);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  
  // Other controller methods...
};
```

## Middleware

Create middleware in the `middlewares` directory:

```javascript
// middlewares/auth.js
module.exports = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Token validation logic
  
  next();
};
```

Apply middleware in routes:

```javascript
const authMiddleware = require('../middlewares/auth');
router.get('/protected', authMiddleware, UserController.protectedMethod);
```

## Views and Templates

GreyCodeJS uses EJS by default for view rendering:

```javascript
// controllers/HomeController.js
module.exports = {
  index(req, res) {
    res.render('home', { title: 'Welcome to GreyCodeJS' });
  }
};
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run cli -- create-model <name>` | Create a new model |
| `npm run cli -- create-controller <name>` | Create a new controller |
| `npm run cli -- create-route <name>` | Create a new route file |
| `npm run cli -- create-middleware <name>` | Create middleware |
| `npm run cli -- create-migration <name>` | Create a migration |
| `npm run cli -- migrate` | Run migrations |
| `npm run cli -- create-seed <name>` | Create a seed file |
| `npm run cli -- seed` | Run seed files |

## Error Handling

GreyCodeJS provides centralized error handling through middleware:

```javascript
// middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    }
  });
};
```

## Advanced Topics

### Custom Services

Create service classes for complex business logic:

```javascript
// services/EmailService.js
class EmailService {
  static async sendWelcomeEmail(user) {
    // Email sending logic
  }
}

module.exports = EmailService;
```

### Validation

Implement request validation:

```javascript
// middlewares/validateUser.js
module.exports = (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // More validation...
  
  next();
};
```

### Authentication

Set up JWT authentication:

```javascript
// services/AuthService.js
const jwt = require('jsonwebtoken');

class AuthService {
  static generateToken(user) {
    return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
  }
  
  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = AuthService;
```

## Deployment

1. Set environment variables for production
2. Build assets if needed
3. Run migrations
4. Start the application in production mode:

```bash
NODE_ENV=production npm start
```

## Resources

- [GitHub Repository](https://github.com/kculz/greycodejs)
- [Report Issues](https://github.com/kculz/greycodejs/issues)
- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)