# Model System Documentation

## Overview

GreyCodeJS uses Sequelize ORM for database operations. Models are automatically loaded and initialized when the application starts.

## How It Works

### 1. Model Loading Process

1. **Database Connection**: `app.js` initializes the database connection via `core/database.js`
2. **Model Initialization**: `models/index.js` scans the models directory and loads all model files
3. **Association Setup**: Model associations are automatically configured
4. **Global Access**: Models are made available globally and via `app.locals.models`

### 2. Creating Models

Use the CLI to generate a new model:

```bash
npm run cli -- create-model User
```

This creates a model file like `models/User.js`:

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
      unique: true
    }
  });

  // Define associations here
  User.associate = (models) => {
    // Example: User.hasMany(models.Post);
  };

  return User;
};
```

### 3. Using Models in Controllers

**Option 1: Import from models/models.js (Recommended)**

```javascript
const { User, Post } = require('../models/models');

const getAll = async (req, res) => {
  const users = await User.findAll();
  res.json(users);
};
```

**Option 2: Access from global**

```javascript
const getAll = async (req, res) => {
  const users = await global.models.User.findAll();
  res.json(users);
};
```

**Option 3: Access from req.app.locals**

```javascript
const getAll = async (req, res) => {
  const { User } = req.app.locals.models;
  const users = await User.findAll();
  res.json(users);
};
```

### 4. Model Associations

Define relationships in the `associate` method:

```javascript
// models/User.js
User.associate = (models) => {
  User.hasMany(models.Post, {
    foreignKey: 'userId',
    as: 'posts'
  });
  User.belongsTo(models.Role, {
    foreignKey: 'roleId',
    as: 'role'
  });
};

// models/Post.js
Post.associate = (models) => {
  Post.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'author'
  });
};
```

### 5. Using Associations

```javascript
const { User, Post } = require('../models/models');

// Eager loading
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts'
  }]
});

// Create with association
const user = await User.findByPk(userId);
const post = await user.createPost({
  title: 'My Post',
  content: 'Post content'
});
```

## Best Practices

### 1. Always Exclude Sensitive Data

```javascript
// Don't send passwords in responses
const users = await User.findAll({
  attributes: { exclude: ['password'] }
});
```

### 2. Use Transactions for Multiple Operations

```javascript
const { sequelize } = require('../models/models');

const t = await sequelize.transaction();

try {
  const user = await User.create({ username: 'john' }, { transaction: t });
  const profile = await Profile.create({ userId: user.id }, { transaction: t });
  
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### 3. Add Validation to Models

```javascript
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    age: {
      type: DataTypes.INTEGER,
      validate: {
        min: 18,
        max: 120
      }
    }
  });

  return User;
};
```

### 4. Use Scopes for Common Queries

```javascript
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // fields...
  }, {
    scopes: {
      active: {
        where: { isActive: true }
      },
      withPosts: {
        include: ['posts']
      }
    }
  });

  return User;
};

// Usage
const activeUsers = await User.scope('active').findAll();
```

### 5. Add Hooks for Business Logic

```javascript
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    password: DataTypes.STRING
  });

  // Hash password before creating
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  // Hash password before updating
  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  return User;
};
```

## Troubleshooting

### Models Not Loading

**Error**: `Models not initialized`

**Solution**: Make sure the application has fully started and the database connection is established before accessing models.

### Model Not Found

**Error**: `Model "User" not found`

**Solution**: 
1. Check that the model file exists in the `models/` directory
2. Verify the model file exports a function
3. Check the model name matches the filename
4. Restart the application

### Association Errors

**Error**: `Association not found`

**Solution**:
1. Ensure both models are defined before associations
2. Check the `associate` method syntax
3. Verify model names match exactly

### Sequelize Sync Issues

**Error**: Table doesn't exist after sync

**Solution**:
1. Run migrations: `npm run cli -- migrate`
2. Check database connection settings
3. Use `{ force: true }` for development (WARNING: drops tables)

## Advanced Usage

### Custom Methods

```javascript
// Instance method
User.prototype.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Class method
User.findByEmail = async function(email) {
  return this.findOne({ where: { email } });
};

// Usage
const user = await User.findByEmail('john@example.com');
const isValid = await user.comparePassword('password123');
```

### Virtual Fields

```javascript
User.define('User', {
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`;
    }
  }
});
```

### Getters and Setters

```javascript
User.define('User', {
  email: {
    type: DataTypes.STRING,
    get() {
      return this.getDataValue('email').toLowerCase();
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase());
    }
  }
});
```

## Migration Workflow

1. Create model: `npm run cli -- create-model User`
2. Edit model file to add fields
3. Run migration: `npm run cli -- migrate`
4. Use model in controllers

For more information, see [Sequelize Documentation](https://sequelize.org/docs/v6/).