# GreyCodeJS CLI Commands Reference

Complete guide to all CLI commands available in GreyCodeJS framework.

## Table of Contents

- [Getting Started](#getting-started)
- [Resource Generation](#resource-generation)
- [Database Commands](#database-commands)
- [Migration Commands](#migration-commands)
- [Seeding Commands](#seeding-commands)
- [Service Commands](#service-commands)
- [Application Commands](#application-commands)
- [Setup Commands](#setup-commands)
- [Utility Commands](#utility-commands)
- [Command Options](#command-options)
- [Workflow Examples](#workflow-examples)

---

## Getting Started

### Installation

```bash
# Install GreyCodeJS globally
npm install -g greycodejs-installer

# Create new project
greycodejs-installer new my-project

# Navigate to project
cd my-project

# Install dependencies
npm install
```

### Running CLI Commands

There are two ways to run CLI commands:

```bash
# Method 1: Using npm script (recommended for local projects)
npm run cli -- <command> [options]

# Method 2: Using global command (if installed globally)
greycodejs <command> [options]
```

**Examples:**
```bash
# Using npm script
npm run cli -- create-model User

# Using global command
greycodejs create-model User
```

> **Note:** In this documentation, we'll use `npm run cli --` format. Replace with `greycodejs` if using global installation.

---

## Resource Generation

### 1. create-model

Generate a new model for your database.

**Syntax:**
```bash
npm run cli -- create-model <ModelName>
```

**Description:**
Creates a new model file in the `models/` directory. The model is generated based on your active ORM (Sequelize, Mongoose, or Prisma).

**Examples:**

```bash
# Create a User model
npm run cli -- create-model User

# Create a Product model
npm run cli -- create-model Product

# Create a BlogPost model
npm run cli -- create-model BlogPost
```

**Generated File (Sequelize):**
```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Add your fields here
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  });

  User.associate = (models) => {
    // Define associations here
  };

  return User;
};
```

**Next Steps:**
1. Edit the model file to add your fields
2. Run migrations: `npm run cli -- migrate`
3. Use the model in your controllers

**Tips:**
- Model names should be in PascalCase (e.g., `User`, `BlogPost`)
- Add validation rules in the model definition
- Define associations in the `associate` method

---

### 2. create-controller

Generate a new controller with CRUD operations.

**Syntax:**
```bash
npm run cli -- create-controller <ControllerName>
```

**Options:**
- `--no-crud` - Create controller without CRUD methods

**Description:**
Creates a controller file in the `controllers/` directory with standard CRUD operations (Create, Read, Update, Delete).

**Examples:**

```bash
# Create UserController with CRUD operations
npm run cli -- create-controller User

# Create AuthController without CRUD
npm run cli -- create-controller Auth --no-crud

# Create ProductController
npm run cli -- create-controller Product
```

**Generated File:**
```javascript
// controllers/UserController.js
const { User } = require('../models/models');

// Create
const create = async (req, res) => {
  try {
    const data = await User.create(req.body);
    return res.status(201).json({
      success: true,
      data,
      message: 'User created successfully'
    });
  } catch (error) {
    req.logger?.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get All
const getAll = async (req, res) => {
  try {
    const data = await User.findAll();
    return res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    req.logger?.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Get By ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    req.logger?.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await data.update(req.body);
    
    return res.json({
      success: true,
      data,
      message: 'User updated successfully'
    });
  } catch (error) {
    req.logger?.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

// Delete
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findByPk(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await data.destroy();
    
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    req.logger?.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};
```

**Next Steps:**
1. Create corresponding routes: `npm run cli -- create-route user`
2. Register routes in your application
3. Customize the controller methods as needed

---

### 3. create-route

Generate route definitions for a controller.

**Syntax:**
```bash
npm run cli -- create-route <routeName>
```

**Description:**
Creates a route file in the `routes/` directory that connects HTTP endpoints to controller methods.

**Examples:**

```bash
# Create user routes
npm run cli -- create-route user

# Create product routes
npm run cli -- create-route product

# Create auth routes
npm run cli -- create-route auth
```

**Generated File:**
```javascript
// routes/user.js
const router = require('express').Router();
const { UserController } = require('../controllers/UserController');

// Define routes for User
router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.remove);

module.exports = { router };
```

**Register Routes in app.js:**
```javascript
// app.js
const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes.router);
```

**Route Endpoints:**
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

---

### 4. create-resource

Generate model, controller, and routes all at once.

**Syntax:**
```bash
npm run cli -- create-resource <ResourceName>
```

**Description:**
Creates a complete resource (model + controller + routes) with a single command. This is the fastest way to scaffold a new feature.

**Examples:**

```bash
# Create complete Product resource
npm run cli -- create-resource Product

# Create complete Order resource
npm run cli -- create-resource Order

# Create complete Category resource
npm run cli -- create-resource Category
```

**What Gets Created:**
```
models/Product.js         # Sequelize model
controllers/ProductController.js   # Controller with CRUD
routes/product.js         # Route definitions
```

**Output:**
```
✅ Model Product created at models/Product.js
✅ Controller ProductController created at controllers/ProductController.js
✅ Route for Product created at routes/product.js

Next steps:
1. Add the route to your app.js or main router file:
   const productRouter = require('./routes/product');
   app.use('/api/products', productRouter.router);
2. Run 'npm run cli -- migrate' to create the database table
```

**Complete Workflow:**

```bash
# 1. Create resource
npm run cli -- create-resource Product

# 2. Edit the model to add fields
# Edit models/Product.js

# 3. Run migration
npm run cli -- migrate

# 4. Register routes in app.js
# Add: app.use('/api/products', require('./routes/product').router);

# 5. Start your server
npm run dev

# 6. Test the endpoints
curl http://localhost:3000/api/products
```

---

## Database Commands

### 5. setup-db

Interactive database configuration wizard.

**Syntax:**
```bash
npm run cli -- setup-db
```

**Description:**
Launches an interactive wizard to configure your database connection. Supports Sequelize (SQL), Mongoose (MongoDB), and Prisma.

**Example Session:**

```bash
npm run cli -- setup-db

? Select your ORM: sequelize
? Database type: mysql
? Database host: localhost
? Database port: 3306
? Database name: myapp_db
? Database username: root
? Database password: ****

✅ Database configuration for sequelize created at: config/database.js

Make sure to add this to your .gitignore:
config/database.js
```

**Supported Databases:**

**Sequelize:**
- MySQL
- PostgreSQL
- SQLite
- Microsoft SQL Server

**Mongoose:**
- MongoDB

**Prisma:**
- PostgreSQL
- MySQL
- SQLite
- SQL Server
- MongoDB
- CockroachDB

**Generated Configuration (MySQL):**
```javascript
// config/database.js
module.exports = {
  "dialect": "mysql",
  "host": "localhost",
  "port": "3306",
  "database": "myapp_db",
  "username": "root",
  "password": "secretpassword"
};
```

**Tips:**
- Run this before creating your first model
- Add `config/database.js` to `.gitignore`
- Use environment variables in production

---

## Migration Commands

### 6. migrate

Run all pending migrations.

**Syntax:**
```bash
npm run cli -- migrate [options]
```

**Options:**
- `--force` - Force sync models (drops existing tables - DANGEROUS!)

**Description:**
Synchronizes your models with the database by creating/updating tables.

**Examples:**

```bash
# Run pending migrations
npm run cli -- migrate

# Force sync (development only - drops tables!)
npm run cli -- migrate --force
```

**What It Does:**
1. Connects to the database
2. Creates the database if it doesn't exist (MySQL/PostgreSQL)
3. Creates/updates tables based on your models
4. Runs any migration scripts in `migrations/` directory

**Output:**
```
[INFO] Initializing database connection with SEQUELIZE
[INFO] Database connection established successfully
[INFO] Running migrations...
[INFO] Executed migration: 20240101120000-create-users-table.js
[INFO] Executed migration: 20240101120001-create-products-table.js
✅ Migrations completed successfully
```

**Warning:**
⚠️ Never use `--force` in production! It will drop all tables and data.

---

### 7. migrate:status

Check migration status.

**Syntax:**
```bash
npm run cli -- migrate:status
```

**Description:**
Shows which migrations have been executed and which are pending.

**Example Output:**

```bash
npm run cli -- migrate:status

Migration Status:
✅ Executed: 3
⏳ Pending: 1

Pending Migrations:
- 20240115120000-add-email-to-users.js
```

**Use Cases:**
- Check if migrations are up to date
- Verify which migrations ran successfully
- Debug migration issues

---

### 8. migrate:undo

Undo the last migration.

**Syntax:**
```bash
npm run cli -- migrate:undo <modelName>
```

**Description:**
Drops the table for a specific model.

**Examples:**

```bash
# Undo User migration (drops users table)
npm run cli -- migrate:undo User

# Undo Product migration
npm run cli -- migrate:undo Product
```

**Output:**
```
Reverting migration for the model: User
✅ Successfully dropped the table for model "User"!
```

**Warning:**
⚠️ This will permanently delete the table and all its data!

---

### 9. migrate:undo:all

Undo ALL migrations (nuclear option).

**Syntax:**
```bash
npm run cli -- migrate:undo:all
```

**Description:**
Drops all tables in the database. Use with extreme caution!

**Example:**

```bash
npm run cli -- migrate:undo:all

Reverting all migrations...
✅ Successfully reverted all migrations!
```

**Use Cases:**
- Resetting development database
- Starting fresh with new schema
- Testing migration scripts

**Warning:**
🚨 This drops ALL tables and deletes ALL data! Never use in production!

**Safe Alternative:**
```bash
# Drop database manually
mysql -u root -p -e "DROP DATABASE myapp_db;"

# Run migrations again
npm run cli -- migrate
```

---

## Seeding Commands

### 10. make-seed

Generate or insert seed data.

**Syntax:**
```bash
npm run cli -- make-seed <ModelName> [options]
```

**Options:**
- `--count <number>` - Number of records to generate (default: 10)
- `--seed` - Insert the generated seed data into database

**Description:**
Generates fake data for testing and development using Faker.js.

**Examples:**

```bash
# Generate seed JSON for User model (10 records)
npm run cli -- make-seed User

# Generate 50 records
npm run cli -- make-seed User --count 50

# Generate and insert into database
npm run cli -- make-seed User --count 20 --seed

# Just insert previously generated seed
npm run cli -- make-seed User --seed
```

**Workflow:**

**Step 1: Generate Seed File**
```bash
npm run cli -- make-seed User --count 10

# Output:
✅ Seed data for model "User" created at seeds/user-seed.json
```

**Generated File:**
```json
// seeds/user-seed.json
[
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "hashed_password",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "username": "jane_smith",
    "email": "jane@example.com",
    "password": "hashed_password",
    "createdAt": "2024-01-15T10:31:00.000Z",
    "updatedAt": "2024-01-15T10:31:00.000Z"
  }
]
```

**Step 2: Edit the Seed Data (Optional)**
Edit `seeds/user-seed.json` to customize the data.

**Step 3: Insert into Database**
```bash
npm run cli -- make-seed User --seed

# Output:
Seeding 10 records into the "User" table...
✅ Successfully seeded 10 records into the "User" table.
```

**Supported Field Types:**
- `STRING` → Random words
- `TEXT` → Random paragraph
- `INTEGER` → Random number
- `BOOLEAN` → Random true/false
- `DATE` → Random past date
- `UUID` → Random UUID

**Tips:**
- Always review generated seed data before inserting
- Use seeds for testing, not production data
- Create different seed files for different scenarios

---

## Service Commands

### 11. make-service

Create a service layer file.

**Syntax:**
```bash
npm run cli -- make-service <ServiceName>
```

**Description:**
Creates a service class in the `services/` directory for business logic that doesn't belong in controllers.

**Examples:**

```bash
# Create Auth service
npm run cli -- make-service Auth

# Create Email service
npm run cli -- make-service Email

# Create Payment service
npm run cli -- make-service Payment
```

**Generated File:**
```javascript
// services/AuthService.js
const { Auth } = require('../models');

class AuthService {
  static async getAll() {
    return await Auth.findAll();
  }

  // Add other service methods here
}

module.exports = AuthService;
```

**Usage in Controllers:**
```javascript
// controllers/AuthController.js
const AuthService = require('../services/AuthService');

const login = async (req, res) => {
  try {
    const user = await AuthService.authenticate(req.body);
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};
```

**When to Use Services:**
- Complex business logic
- Code used by multiple controllers
- Third-party API integrations
- Email sending
- Payment processing
- File uploads
- Authentication logic

**Service Best Practices:**
```javascript
// services/UserService.js
const { User } = require('../models/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  // Authentication
  static async authenticate(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid password');
    
    return user;
  }

  // Generate JWT token
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Get user profile
  static async getProfile(userId) {
    return await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
  }

  // Update profile
  static async updateProfile(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    
    // Don't allow password updates here
    const { password, ...safeData } = data;
    
    return await user.update(safeData);
  }

  // Change password
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) throw new Error('Invalid current password');
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });
    
    return true;
  }
}

module.exports = UserService;
```

---

## Application Commands

### 12. run

Start the application.

**Syntax:**
```bash
npm run cli -- run [options]
```

**Options:**
- `--watch` - Run with nodemon for auto-reload on file changes

**Description:**
Starts your GreyCodeJS application server.

**Examples:**

```bash
# Start normally
npm run cli -- run

# Start with auto-reload (development)
npm run cli -- run --watch
```

**With --watch:**
```
Running the application with nodemon...
✅ Application has started.
[INFO] Server running on port 3000
[INFO] Access the app: http://localhost:3000

# When you save a file:
Application restarted due to changes in: controllers/UserController.js
```

**Equivalent npm scripts:**
```bash
# Instead of using CLI, you can use:
npm start           # Production
npm run dev         # Development with nodemon
```

---

## Setup Commands

### 13. setup-prisma

Initialize Prisma in your project.

**Syntax:**
```bash
npm run cli -- setup-prisma
```

**Description:**
Sets up Prisma ORM in your project by running `npx prisma init`.

**Example:**

```bash
npm run cli -- setup-prisma

Setting up Prisma...
✅ Prisma initialized successfully

Next steps:
1. Configure your database in prisma/schema.prisma
2. Run "npm run cli -- migrate" to apply migrations
```

**What It Creates:**
```
project/
├── prisma/
│   └── schema.prisma     # Prisma schema file
├── .env                  # Database URL
```

**Example schema.prisma:**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Prisma Workflow:**
```bash
# 1. Initialize Prisma
npm run cli -- setup-prisma

# 2. Edit prisma/schema.prisma to define your models

# 3. Generate Prisma Client
npx prisma generate

# 4. Create and run migration
npx prisma migrate dev --name init

# 5. Use in your code
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const users = await prisma.user.findMany();
```

---

## Utility Commands

### 14. list-commands

List all available CLI commands.

**Syntax:**
```bash
npm run cli -- list-commands
```

**Description:**
Displays a list of all available CLI commands with their descriptions.

**Example Output:**

```
Available Commands:

create-model              Generate a new model for the active ORM

create-controller         Create a new controller with basic CRUD operations

create-route              Generate a new route file for a specified controller

create-resource           Generate all resources (model, controller, route) for a given name

migrate                   Run migrations for the active ORM

migrate:status            Show migration status

migrate:undo              Undo the migration for the specified model by dropping its table

migrate:undo:all          Undo all migrations (rollback database to initial state)

make-seed                 Generate a JSON file for seeding or seed data into the database

make-service              Create a new service layer file

run                       Start the GreyCodeJS application

setup-db                  Configure database settings for the active ORM

setup-prisma              Initialize Prisma in the project

list-commands             List all available CLI commands


Use "npm run cli -- <command> --help" for detailed information about a specific command.
```

---

## Command Options

### Global Options

These options work with most commands:

**--help, -h**
```bash
# Show help for any command
npm run cli -- create-model --help
npm run cli -- migrate -h
```

**--version, -V**
```bash
# Show CLI version
npm run cli -- --version
```

### Command-Specific Options

| Command | Options | Description |
|---------|---------|-------------|
| `create-controller` | `--no-crud` | Create without CRUD methods |
| `migrate` | `--force` | Force sync (drops tables) |
| `make-seed` | `--count <n>` | Number of records |
| `make-seed` | `--seed` | Insert seed data |
| `run` | `--watch` | Auto-reload on changes |

---

## Workflow Examples

### Example 1: Building a Blog

```bash
# 1. Setup database
npm run cli -- setup-db
# Choose: MySQL, database: blog_db

# 2. Create resources
npm run cli -- create-resource Post
npm run cli -- create-resource Comment
npm run cli -- create-resource Category

# 3. Edit models to add fields
# Edit models/Post.js, models/Comment.js, models/Category.js

# 4. Add associations
# In Post model:
# Post.associate = (models) => {
#   Post.hasMany(models.Comment);
#   Post.belongsTo(models.Category);
# }

# 5. Run migrations
npm run cli -- migrate

# 6. Generate seed data
npm run cli -- make-seed Post --count 20
npm run cli -- make-seed Comment --count 100
npm run cli -- make-seed Category --count 5

# 7. Insert seed data
npm run cli -- make-seed Post --seed
npm run cli -- make-seed Comment --seed
npm run cli -- make-seed Category --seed

# 8. Register routes in app.js
# app.use('/api/posts', require('./routes/post').router);
# app.use('/api/comments', require('./routes/comment').router);
# app.use('/api/categories', require('./routes/category').router);

# 9. Start server
npm run dev

# 10. Test endpoints
curl http://localhost:3000/api/posts
curl http://localhost:3000/api/comments
curl http://localhost:3000/api/categories
```

### Example 2: Adding Authentication

```bash
# 1. Create User model
npm run cli -- create-model User

# 2. Edit User model
# Add fields: username, email, password, role

# 3. Create Auth service
npm run cli -- make-service Auth

# 4. Edit AuthService
# Add methods: register, login, verifyToken

# 5. Create Auth controller
npm run cli -- create-controller Auth --no-crud

# 6. Edit AuthController
# Add methods: register, login, logout, me

# 7. Create auth routes
npm run cli -- create-route auth

# 8. Edit auth routes
# router.post('/register', AuthController.register);
# router.post('/login', AuthController.login);
# router.post('/logout', AuthController.logout);
# router.get('/me', AuthController.me);

# 9. Run migrations
npm run cli -- migrate

# 10. Register routes
# app.use('/api/auth', require('./routes/auth').router);

# 11. Test
npm run dev
```

### Example 3: E-commerce Store

```bash
# 1. Setup database
npm run cli -- setup-db

# 2. Create all resources
npm run cli -- create-resource Product
npm run cli -- create-resource Category
npm run cli -- create-resource Order
npm run cli -- create-resource OrderItem
npm run cli -- create-resource Customer

# 3. Create services for complex logic
npm run cli -- make-service Cart
npm run cli -- make-service Payment
npm run cli -- make-service Inventory

# 4. Edit models and add associations
# Product belongsTo Category
# Order hasMany OrderItem
# Order belongsTo Customer
# OrderItem belongsTo Product

# 5. Run migrations
npm run cli -- migrate

# 6. Seed test data
npm run cli -- make-seed Category --count 10 --seed
npm run cli -- make-seed Product --count 100 --seed
npm run cli -- make-seed Customer --count 50 --seed

# 7. Register all routes
# Edit app.js to register routes

# 8. Start development server
npm run dev
```

### Example 4: API with User Roles

```bash
# 1. Create User and Role models
npm run cli -- create-model User
npm run cli -- create-model Role

# 2. Create controllers
npm run cli -- create-controller User
npm run cli -- create-controller Role

# 3. Create authentication service
npm run cli -- make-service Auth

# 4. Create middleware
# Create middlewares/auth.js manually
# Create middlewares/roleCheck.js manually

# 5. Create routes with middleware
npm run cli -- create-route user
npm run cli -- create-route role

# 6. Edit routes to add middleware
# router.use(authMiddleware);
# router.post('/', roleCheck(['admin']), UserController.create);

# 7. Run migrations
npm run cli -- migrate

# 8. Seed admin user
npm run cli -- make-seed User --count 1
# Edit seed to add admin user
npm run cli -- make-seed User --seed

# 9. Test authentication
npm run dev
```

---

## Tips and Best Practices

### 1. Model Creation

```bash
# ✅ Good - PascalCase
npm run cli -- create-model User
npm run cli -- create-model BlogPost
npm run cli -- create-model OrderItem

# ❌ Bad - lowercase or snake_case
npm run cli -- create-model user
npm run cli -- create-model blog_post
```

### 2. Always Run Migrations After Model Creation

```bash
# Create model
npm run cli -- create-model Product

# Edit the model to add fields
nano models/Product.js

# Run migration
npm run cli -- migrate
```

### 3. Use Seeds for Testing

```bash
# Generate seeds without inserting
npm run cli -- make-seed User --count 50

# Review and edit the generated JSON
nano seeds/user-seed.json

# Insert when ready
npm run cli -- make-seed User --seed
```

### 4. Create Complete Resources

```bash
# Instead of three separate commands:
npm run cli -- create-model Product
npm run cli -- create-controller Product
npm run cli -- create-route product

# Use one command:
npm run cli -- create-resource Product
```

### 5. Check Migration Status Before Deploying

```bash
# Before deploying to production
npm run cli -- migrate:status

# Should show:
# ✅ Executed: 10
# ⏳ Pending: 0
```

### 6. Use Services for Complex Logic

```bash
# Create service for business logic
npm run cli -- make-service Email

# Use in controllers:
# const EmailService = require('../services/EmailService');
# await EmailService.sendWelcomeEmail(user);
```

---

## Troubleshooting

### Command Not Found

```bash
# Error: Command not found

# Solution 1: Check CLI is installed
npm list greycodejs

# Solution 2: Use npm run cli
npm run cli -- create-model User

# Solution 3: Reinstall
npm install
```

### Model Already Exists

```bash
# Error: Model "User" already exists

# Solution: Use a different name or delete the existing model
rm