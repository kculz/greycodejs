# GreyCodeJS Multi-ORM Support Guide

GreyCodeJS supports three popular ORMs: **Sequelize** (SQL), **Mongoose** (MongoDB), and **Prisma** (Multi-database). This guide shows you how to use each one.

---

## Table of Contents

- [Choosing Your ORM](#choosing-your-orm)
- [Sequelize (SQL Databases)](#sequelize-sql-databases)
- [Mongoose (MongoDB)](#mongoose-mongodb)
- [Prisma (Multi-Database)](#prisma-multi-database)
- [Switching ORMs](#switching-orms)
- [Model Patterns](#model-patterns)
- [Controller Patterns](#controller-patterns)
- [Common Operations](#common-operations)

---

## Choosing Your ORM

### When to Use Sequelize
✅ **Best for:**
- Relational databases (MySQL, PostgreSQL, SQLite, MSSQL)
- Complex relationships and joins
- Traditional SQL applications
- Existing SQL databases

### When to Use Mongoose
✅ **Best for:**
- MongoDB (NoSQL)
- Flexible schemas
- Document-based data
- Rapid prototyping

### When to Use Prisma
✅ **Best for:**
- Type-safe database access
- Multiple database support
- Modern development workflow
- Auto-generated types

---

## Setting Up Your ORM

### 1. Configure ORM

Edit `config/orm.js`:

```javascript
module.exports = {
  activeORM: 'sequelize' // or 'mongoose' or 'prisma'
};
```

### 2. Setup Database

```bash
npm run cli -- setup-db
```

This will guide you through database configuration for your chosen ORM.

---

## Sequelize (SQL Databases)

### Installation

```bash
npm install sequelize mysql2  # For MySQL
# OR
npm install sequelize pg pg-hstore  # For PostgreSQL
# OR
npm install sequelize sqlite3  # For SQLite
```

### Configuration

`config/database.js`:

```javascript
module.exports = {
  dialect: 'mysql',  // mysql, postgres, sqlite, mssql
  host: 'localhost',
  port: 3306,
  database: 'myapp_db',
  username: 'root',
  password: 'password'
};
```

### Create a Model

```bash
npm run cli -- create-model User
```

Generated model (`models/User.js`):

```javascript
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user'
    }
  });

  // Define associations
  User.associate = (models) => {
    User.hasMany(models.Post, {
      foreignKey: 'userId',
      as: 'posts'
    });
  };

  return User;
};
```

### Run Migrations

```bash
npm run cli -- migrate
```

### Using the Model

```javascript
const { User } = require('../models/models');

// Create
const user = await User.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'hashedpassword'
});

// Find all
const users = await User.findAll();

// Find one
const user = await User.findByPk(userId);

// Find with condition
const user = await User.findOne({
  where: { email: 'john@example.com' }
});

// Update
await user.update({ username: 'john_updated' });

// Delete
await user.destroy();

// With associations
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts'
  }]
});
```

---

## Mongoose (MongoDB)

### Installation

```bash
npm install mongoose
```

### Configuration

`config/database.js`:

```javascript
module.exports = {
  uri: 'mongodb://localhost:27017/myapp_db',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};
```

### Create a Model

```bash
npm run cli -- create-model User
```

Generated model (`models/User.js`):

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    firstName: String,
    lastName: String,
    age: Number
  }
}, { 
  timestamps: true 
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Instance methods
UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Middleware
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
```

### Using the Model

```javascript
const { User } = require('../models/models');

// Create
const user = await User.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'password123',
  profile: {
    firstName: 'John',
    lastName: 'Doe'
  }
});

// Find all
const users = await User.find();

// Find one
const user = await User.findById(userId);

// Find with condition
const user = await User.findOne({ email: 'john@example.com' });

// Update
await User.findByIdAndUpdate(userId, { username: 'john_updated' });

// Delete
await User.findByIdAndDelete(userId);

// With population (like JOIN)
const user = await User.findById(userId).populate('posts');

// Using static methods
const user = await User.findByEmail('john@example.com');
```

---

## Prisma (Multi-Database)

### Installation

```bash
npm install @prisma/client
npm install -D prisma
```

### Initialize Prisma

```bash
npm run cli -- setup-prisma
```

This creates:
- `prisma/schema.prisma` - Your database schema
- `.env` - Environment variables

### Configuration

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // or "mysql", "sqlite", "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  role      Role     @default(USER)
  profile   Profile?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Profile {
  id        String  @id @default(uuid())
  firstName String?
  lastName  String?
  age       Int?
  userId    String  @unique
  user      User    @relation(fields: [userId], references: [id])
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

`.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/myapp_db"
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Migrations

```bash
npx prisma migrate dev --name init
```

### Using Prisma

```javascript
const { prisma } = require('../models/models');

// Create
const user = await prisma.user.create({
  data: {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'hashedpassword',
    profile: {
      create: {
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  }
});

// Find all
const users = await prisma.user.findMany();

// Find one
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// Find with condition
const user = await prisma.user.findFirst({
  where: { email: 'john@example.com' }
});

// Update
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: { username: 'john_updated' }
});

// Delete
await prisma.user.delete({
  where: { id: userId }
});

// With relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
    posts: true
  }
});
```

---

## Switching ORMs

### From Sequelize to Mongoose

1. **Update ORM config**:
```javascript
// config/orm.js
module.exports = {
  activeORM: 'mongoose'
};
```

2. **Update database config**:
```bash
npm run cli -- setup-db
```

3. **Convert models**:
   - Sequelize models → Mongoose schemas
   - `DataTypes.STRING` → `String`
   - `DataTypes.INTEGER` → `Number`
   - `DataTypes.BOOLEAN` → `Boolean`

4. **Update controllers**:
   - `findByPk()` → `findById()`
   - `findAll()` → `find()`
   - `update()` → `findByIdAndUpdate()`
   - `destroy()` → `findByIdAndDelete()`

### From Sequelize to Prisma

1. **Install Prisma**: `npm install @prisma/client prisma`
2. **Initialize**: `npm run cli -- setup-prisma`
3. **Define schema** in `prisma/schema.prisma`
4. **Generate client**: `npx prisma generate`
5. **Run migrations**: `npx prisma migrate dev`
6. **Update controllers** to use Prisma syntax

---

## Model Patterns

### Sequelize Patterns

**Hooks:**
```javascript
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});
```

**Scopes:**
```javascript
User.addScope('active', {
  where: { isActive: true }
});

// Usage
const activeUsers = await User.scope('active').findAll();
```

**Getters/Setters:**
```javascript
email: {
  type: DataTypes.STRING,
  get() {
    return this.getDataValue('email').toLowerCase();
  }
}
```

### Mongoose Patterns

**Virtuals:**
```javascript
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
```

**Middleware:**
```javascript
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
```

**Methods:**
```javascript
UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};
```

### Prisma Patterns

**Middleware:**
```javascript
// In app.js or middleware file
prisma.$use(async (params, next) => {
  if (params.action === 'create' && params.model === 'User') {
    params.args.data.password = await bcrypt.hash(params.args.data.password, 10);
  }
  return next(params);
});
```

---

## Controller Patterns

### Universal Controller Pattern

```javascript
const { User } = require('../models/models');
const { activeORM } = require('../config/orm');

// Create
const create = async (req, res) => {
  try {
    let user;
    
    if (activeORM === 'prisma') {
      user = await prisma.user.create({ data: req.body });
    } else {
      user = await User.create(req.body);
    }
    
    return res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All
const getAll = async (req, res) => {
  try {
    let users;
    
    switch (activeORM) {
      case 'sequelize':
        users = await User.findAll();
        break;
      case 'mongoose':
        users = await User.find();
        break;
      case 'prisma':
        users = await prisma.user.findMany();
        break;
    }
    
    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## Common Operations

### Create

| Operation | Sequelize | Mongoose | Prisma |
|-----------|-----------|----------|--------|
| Create one | `Model.create(data)` | `Model.create(data)` | `prisma.model.create({ data })` |
| Create many | `Model.bulkCreate([...])` | `Model.insertMany([...])` | `prisma.model.createMany({ data: [...] })` |

### Read

| Operation | Sequelize | Mongoose | Prisma |
|-----------|-----------|----------|--------|
| Find all | `Model.findAll()` | `Model.find()` | `prisma.model.findMany()` |
| Find by ID | `Model.findByPk(id)` | `Model.findById(id)` | `prisma.model.findUnique({ where: { id } })` |
| Find one | `Model.findOne({ where })` | `Model.findOne({ })` | `prisma.model.findFirst({ where })` |

### Update

| Operation | Sequelize | Mongoose | Prisma |
|-----------|-----------|----------|--------|
| Update one | `instance.update(data)` | `Model.findByIdAndUpdate(id, data)` | `prisma.model.update({ where, data })` |
| Update many | `Model.update(data, { where })` | `Model.updateMany({ }, data)` | `prisma.model.updateMany({ where, data })` |

### Delete

| Operation | Sequelize | Mongoose | Prisma |
|-----------|-----------|----------|--------|
| Delete one | `instance.destroy()` | `Model.findByIdAndDelete(id)` | `prisma.model.delete({ where: { id } })` |
| Delete many | `Model.destroy({ where })` | `Model.deleteMany({ })` | `prisma.model.deleteMany({ where })` |

---

## Best Practices

### 1. Use Transactions

**Sequelize:**
```javascript
const t = await sequelize.transaction();
try {
  await User.create({...}, { transaction: t });
  await Profile.create({...}, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
}
```

**Mongoose:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await User.create([{...}], { session });
  await Profile.create([{...}], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
}
```

**Prisma:**
```javascript
await prisma.$transaction([
  prisma.user.create({ data: {...} }),
  prisma.profile.create({ data: {...} })
]);
```

### 2. Use Environment Variables

```javascript
// config/database.js
module.exports = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'myapp_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};
```

### 3. Use Connection Pooling

Already configured in `core/database.js` for optimal performance.

---

## Troubleshooting

### Sequelize Issues

**Error**: `Table doesn't exist`
```bash
npm run cli -- migrate
```

**Error**: `Connection refused`
- Check database is running
- Verify credentials in `config/database.js`

### Mongoose Issues

**Error**: `MongoServerError: Authentication failed`
- Check MongoDB connection string
- Verify username/password

### Prisma Issues

**Error**: `Can't reach database server`
```bash
# Check DATABASE_URL in .env
# Verify database is running
npx prisma db push
```

---

## Summary

- ✅ **Sequelize**: Best for SQL databases with complex relations
- ✅ **Mongoose**: Best for MongoDB with flexible schemas
- ✅ **Prisma**: Best for type-safe, modern development

Choose the ORM that best fits your project needs. GreyCodeJS supports all three seamlessly! 🚀