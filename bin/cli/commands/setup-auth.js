const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * Register setup-auth command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('setup-auth')
    .description('Set up JWT authentication system for your application')
    .option('--skip-install', 'Skip npm package installation')
    .option('--force', 'Overwrite existing files')
    .action(async (options) => {
      // Use dynamic import for inquirer (ESM module)
      let inquirer;
      try {
        inquirer = (await import('inquirer')).default;
      } catch (error) {
        console.error(chalk.red('❌ Failed to load inquirer. Please install it:'));
        console.error(chalk.cyan('   npm install inquirer'));
        process.exit(1);
      }

      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║        GreyCodeJS Authentication Setup Wizard             ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

      try {
        // Step 1: Ask user preference
        const { setupType } = await inquirer.prompt([
          {
            type: 'list',
            name: 'setupType',
            message: 'How would you like to set up authentication?',
            choices: [
              {
                name: '🚀 Complete JWT Setup (Recommended) - Includes all auth features',
                value: 'complete'
              },
              {
                name: '📦 Basic JWT Setup - Core auth only (register, login, middleware)',
                value: 'basic'
              },
              {
                name: '🔧 Custom - Choose specific components',
                value: 'custom'
              },
              {
                name: '❌ Cancel - I\'ll create my own auth system',
                value: 'cancel'
              }
            ]
          }
        ]);

        if (setupType === 'cancel') {
          console.log(chalk.yellow('\n✋ Setup cancelled. You can set up your own auth system.\n'));
          return;
        }

        let components = {
          service: true,
          controller: true,
          middleware: true,
          routes: true,
          changePassword: true,
          refreshToken: true,
          roleAuth: true,
          documentation: true
        };

        if (setupType === 'basic') {
          components.changePassword = false;
          components.refreshToken = false;
          components.roleAuth = false;
          components.documentation = false;
        } else if (setupType === 'custom') {
          const customChoices = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selected',
              message: 'Select components to install:',
              choices: [
                { name: 'AuthService (Core authentication logic)', value: 'service', checked: true },
                { name: 'AuthController (API endpoints)', value: 'controller', checked: true },
                { name: 'Auth Middleware (Route protection)', value: 'middleware', checked: true },
                { name: 'Auth Routes (Pre-configured routes)', value: 'routes', checked: true },
                { name: 'Change Password Feature', value: 'changePassword', checked: true },
                { name: 'Refresh Token Support', value: 'refreshToken', checked: true },
                { name: 'Role-based Authorization', value: 'roleAuth', checked: true },
                { name: 'Documentation & Examples', value: 'documentation', checked: true }
              ]
            }
          ]);

          components = {
            service: customChoices.selected.includes('service'),
            controller: customChoices.selected.includes('controller'),
            middleware: customChoices.selected.includes('middleware'),
            routes: customChoices.selected.includes('routes'),
            changePassword: customChoices.selected.includes('changePassword'),
            refreshToken: customChoices.selected.includes('refreshToken'),
            roleAuth: customChoices.selected.includes('roleAuth'),
            documentation: customChoices.selected.includes('documentation')
          };
        }

        // Step 2: Check for existing files
        const filesToCreate = getFilesToCreate(components);
        const existingFiles = filesToCreate.filter(f => fs.existsSync(f.path));

        if (existingFiles.length > 0 && !options.force) {
          console.log(chalk.yellow('\n⚠️  The following files already exist:'));
          existingFiles.forEach(f => console.log(chalk.gray(`   - ${f.path}`)));

          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: 'Do you want to overwrite existing files?',
              default: false
            }
          ]);

          if (!overwrite) {
            console.log(chalk.yellow('\n✋ Setup cancelled to prevent overwriting files.\n'));
            return;
          }
        }

        // Step 3: Install dependencies
        console.log(chalk.blue('\n📦 Checking dependencies...\n'));
        
        const requiredDeps = ['bcryptjs', 'jsonwebtoken'];
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        let packageJson = {};
        
        if (fs.existsSync(packageJsonPath)) {
          packageJson = require(packageJsonPath);
        }
        
        const missingDeps = requiredDeps.filter(dep => 
          !packageJson.dependencies || !packageJson.dependencies[dep]
        );

        if (missingDeps.length > 0 && !options.skipInstall) {
          console.log(chalk.yellow(`Missing dependencies: ${missingDeps.join(', ')}`));
          
          const { installDeps } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'installDeps',
              message: 'Install missing dependencies?',
              default: true
            }
          ]);

          if (installDeps) {
            console.log(chalk.blue('\nInstalling dependencies...\n'));
            try {
              execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
              console.log(chalk.green('\n✅ Dependencies installed successfully\n'));
            } catch (error) {
              console.log(chalk.red('\n❌ Failed to install dependencies'));
              console.log(chalk.yellow('Please run manually: npm install ' + missingDeps.join(' ') + '\n'));
            }
          }
        } else if (missingDeps.length === 0) {
          console.log(chalk.green('✅ All dependencies already installed\n'));
        }

        // Step 4: Generate JWT secrets
        console.log(chalk.blue('🔐 Generating JWT secrets...\n'));
        
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

        // Step 5: Update .env file
        updateEnvFile(jwtSecret, jwtRefreshSecret, components);

        // Step 6: Create auth files
        console.log(chalk.blue('\n📝 Creating authentication files...\n'));
        
        let filesCreated = 0;
        
        for (const file of filesToCreate) {
          try {
            // Ensure directory exists
            const dir = path.dirname(file.path);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            // Create file
            fs.writeFileSync(file.path, file.content);
            console.log(chalk.green(`   ✅ Created: ${file.path}`));
            filesCreated++;
          } catch (error) {
            console.log(chalk.red(`   ❌ Failed to create: ${file.path}`));
            console.log(chalk.gray(`      Error: ${error.message}`));
          }
        }

        // Step 7: Update User model if needed
        console.log(chalk.blue('\n👤 Checking User model...\n'));
        updateUserModel();

        // Step 8: Success summary
        console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║              🎉 Setup Complete!                            ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n'));

        console.log(chalk.cyan('📊 Summary:'));
        console.log(chalk.gray(`   Files created: ${filesCreated}`));
        console.log(chalk.gray(`   Dependencies: ${missingDeps.length === 0 ? 'Already installed' : 'Installed'}`));
        console.log(chalk.gray(`   JWT secrets: Generated and saved to .env\n`));

        console.log(chalk.cyan('📚 Next Steps:\n'));
        console.log(chalk.white('1. Review the generated files in:'));
        console.log(chalk.gray('   - services/AuthService.js'));
        console.log(chalk.gray('   - controllers/AuthController.js'));
        console.log(chalk.gray('   - middlewares/auth.js'));
        console.log(chalk.gray('   - routes/auth.js\n'));

        console.log(chalk.white('2. Start your server:'));
        console.log(chalk.cyan('   npm run dev\n'));

        console.log(chalk.white('3. Test authentication endpoints:'));
        console.log(chalk.gray('   POST /auth/register'));
        console.log(chalk.gray('   POST /auth/login'));
        console.log(chalk.gray('   GET  /auth/me (protected)\n'));

        if (components.documentation) {
          console.log(chalk.white('4. Read the documentation:'));
          console.log(chalk.cyan('   cat AUTH_SETUP.md\n'));
        }

        console.log(chalk.white('5. Run tests:'));
        console.log(chalk.cyan('   node scripts/test-auth-system.js\n'));

        console.log(chalk.yellow('⚠️  Important: Keep your JWT secrets in .env safe and never commit them!\n'));

      } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error.message);
        if (process.env.NODE_ENV === 'development') {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
};

/**
 * Get list of files to create based on selected components
 */
function getFilesToCreate(components) {
  const files = [];

  // AuthService
  if (components.service) {
    files.push({
      path: path.join(process.cwd(), 'services', 'AuthService.js'),
      content: generateAuthService(components)
    });
  }

  // AuthController
  if (components.controller) {
    files.push({
      path: path.join(process.cwd(), 'controllers', 'AuthController.js'),
      content: generateAuthController(components)
    });
  }

  // Auth Middleware
  if (components.middleware) {
    files.push({
      path: path.join(process.cwd(), 'middlewares', 'auth.js'),
      content: generateAuthMiddleware(components)
    });
  }

  // Auth Routes
  if (components.routes) {
    files.push({
      path: path.join(process.cwd(), 'routes', 'auth.js'),
      content: generateAuthRoutes(components)
    });
  }

  // Documentation
  if (components.documentation) {
    files.push({
      path: path.join(process.cwd(), 'AUTH_SETUP.md'),
      content: generateDocumentation(components)
    });

    files.push({
      path: path.join(process.cwd(), 'scripts', 'test-auth-system.js'),
      content: generateTestScript()
    });
  }

  return files;
}

/**
 * Update .env file with JWT configuration
 */
function updateEnvFile(jwtSecret, jwtRefreshSecret, components) {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if JWT_SECRET already exists
  if (envContent.includes('JWT_SECRET=')) {
    console.log(chalk.yellow('   ⚠️  JWT_SECRET already exists in .env, skipping...'));
    return;
  }

  // Add JWT configuration
  const jwtConfig = `
# JWT Authentication (Generated by setup-auth)
JWT_SECRET=${jwtSecret}
${components.refreshToken ? `JWT_REFRESH_SECRET=${jwtRefreshSecret}` : ''}
JWT_EXPIRES_IN=1h
${components.refreshToken ? 'JWT_REFRESH_EXPIRES_IN=7d' : ''}
BCRYPT_ROUNDS=10
`;

  fs.appendFileSync(envPath, jwtConfig);
  console.log(chalk.green('   ✅ Updated .env with JWT configuration'));

  // Update .env.example if it exists
  if (fs.existsSync(envExamplePath)) {
    let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    if (!exampleContent.includes('JWT_SECRET=')) {
      const exampleJwtConfig = `
# JWT Authentication
JWT_SECRET=your_jwt_secret_change_this_in_production
${components.refreshToken ? 'JWT_REFRESH_SECRET=your_jwt_refresh_secret_change_this_in_production' : ''}
JWT_EXPIRES_IN=1h
${components.refreshToken ? 'JWT_REFRESH_EXPIRES_IN=7d' : ''}
BCRYPT_ROUNDS=10
`;
      fs.appendFileSync(envExamplePath, exampleJwtConfig);
      console.log(chalk.green('   ✅ Updated .env.example'));
    }
  } else {
    // Create .env.example if it doesn't exist
    const exampleJwtConfig = `
# JWT Authentication
JWT_SECRET=your_jwt_secret_change_this_in_production
${components.refreshToken ? 'JWT_REFRESH_SECRET=your_jwt_refresh_secret_change_this_in_production' : ''}
JWT_EXPIRES_IN=1h
${components.refreshToken ? 'JWT_REFRESH_EXPIRES_IN=7d' : ''}
BCRYPT_ROUNDS=10
`;
    fs.writeFileSync(envExamplePath, exampleJwtConfig.trim());
    console.log(chalk.green('   ✅ Created .env.example'));
  }
}

/**
 * Update User model to ensure password field exists
 */
function updateUserModel() {
  const userModelPath = path.join(process.cwd(), 'models', 'User.js');

  if (!fs.existsSync(userModelPath)) {
    console.log(chalk.yellow('   ⚠️  User model not found. Create it with:'));
    console.log(chalk.cyan('      npm run cli -- create-model User'));
    return;
  }

  const content = fs.readFileSync(userModelPath, 'utf8');

  if (content.includes('password')) {
    console.log(chalk.green('   ✅ User model already has password field'));
  } else {
    console.log(chalk.yellow('   ⚠️  User model may need a password field'));
    console.log(chalk.gray('      Add this to your User model:'));
    console.log(chalk.cyan('      password: {'));
    console.log(chalk.cyan('        type: DataTypes.STRING,'));
    console.log(chalk.cyan('        allowNull: false'));
    console.log(chalk.cyan('      }'));
  }
}

/**
 * Generate AuthService content
 */
function generateAuthService(components) {
  return `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * AuthService
 * Handles authentication logic: registration, login, token generation
 */
class AuthService {
  /**
   * Hash a password
   */
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  ${components.refreshToken ? `/**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }` : ''}

  /**
   * Verify JWT token
   */
  static verifyToken(token${components.refreshToken ? ', isRefreshToken = false' : ''}) {
    const secret = ${components.refreshToken ? 'isRefreshToken ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) : ' : ''}process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Register a new user
   */
  static async register(User, userData) {
    try {
      const { email, password, username, ...otherData } = userData;

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const existingUser = await this.findUserByEmail(User, email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await this.hashPassword(password);

      const user = await User.create({
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        ...otherData
      });

      const accessToken = this.generateAccessToken({ 
        userId: user.id, 
        email: user.email 
      });
      ${components.refreshToken ? 'const refreshToken = this.generateRefreshToken({ userId: user.id });' : ''}

      return {
        user: this.sanitizeUser(user),
        accessToken${components.refreshToken ? ',\n        refreshToken' : ''}
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(User, email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const user = await this.findUserByEmail(User, email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await this.comparePassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const accessToken = this.generateAccessToken({ 
        userId: user.id, 
        email: user.email 
      });
      ${components.refreshToken ? 'const refreshToken = this.generateRefreshToken({ userId: user.id });' : ''}

      return {
        user: this.sanitizeUser(user),
        accessToken${components.refreshToken ? ',\n        refreshToken' : ''}
      };
    } catch (error) {
      throw error;
    }
  }

  ${components.refreshToken ? `/**
   * Refresh access token
   */
  static async refreshAccessToken(User, refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken, true);
      const user = await this.findUserById(User, decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = this.generateAccessToken({ 
        userId: user.id, 
        email: user.email 
      });

      return {
        accessToken,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      throw error;
    }
  }` : ''}

  /**
   * Find user by email
   */
  static async findUserByEmail(User, email) {
    // This method adapts to your ORM
    if (typeof User.findOne === 'function') {
      return await User.findOne({ where: { email } });
    } else if (typeof User.findByEmail === 'function') {
      return await User.findByEmail(email);
    } else {
      // Fallback: try different patterns
      try {
        return await User.findOne({ email });
      } catch (error) {
        throw new Error('Could not find user by email - check your User model');
      }
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(User, userId) {
    // This method adapts to your ORM
    if (typeof User.findByPk === 'function') {
      return await User.findByPk(userId);
    } else if (typeof User.findById === 'function') {
      return await User.findById(userId);
    } else {
      // Fallback: try different patterns
      try {
        return await User.findOne({ where: { id: userId } });
      } catch (error) {
        throw new Error('Could not find user by ID - check your User model');
      }
    }
  }

  /**
   * Remove sensitive data from user object
   */
  static sanitizeUser(user) {
    const userObj = user.toJSON ? user.toJSON() : { ...user };
    delete userObj.password;
    delete userObj.__v;
    return userObj;
  }

  ${components.changePassword ? `/**
   * Change user password
   */
  static async changePassword(User, userId, oldPassword, newPassword) {
    try {
      const user = await this.findUserById(User, userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await this.comparePassword(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const hashedPassword = await this.hashPassword(newPassword);

      // Update password based on ORM
      if (typeof user.update === 'function') {
        await user.update({ password: hashedPassword });
      } else if (typeof user.save === 'function') {
        user.password = hashedPassword;
        await user.save();
      } else {
        await User.update({ password: hashedPassword }, { where: { id: userId } });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }` : ''}
}

module.exports = AuthService;
`;
}

/**
 * Generate AuthController content
 */
function generateAuthController(components) {
  return `const AuthService = require('../services/AuthService');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { User } = req.models || req.app.locals?.models || {};
    
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'User model not found'
      });
    }

    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const result = await AuthService.register(User, { email, password, username });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });

  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { User } = req.models || req.app.locals?.models || {};
    
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'User model not found'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(User, email, password);

    return res.json({
      success: true,
      message: 'Login successful',
      data: result
    });

  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

${components.refreshToken ? `/**
 * Refresh access token
 */
const refresh = async (req, res) => {
  try {
    const { User } = req.models || req.app.locals?.models || {};
    
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'User model not found'
      });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const result = await AuthService.refreshAccessToken(User, refreshToken);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });

  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please login again.',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
` : ''}

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    return res.json({
      success: true,
      data: req.user.data || req.user
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

${components.changePassword ? `/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { User } = req.models || req.app.locals?.models || {};
    
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'User model not found'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    await AuthService.changePassword(User, req.user.userId || req.user.id, oldPassword, newPassword);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
` : ''}

/**
 * Logout
 */
const logout = async (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  login,
  ${components.refreshToken ? 'refresh,' : ''}
  getProfile,
  ${components.changePassword ? 'changePassword,' : ''}
  logout
};
`;
}

/**
 * Generate Auth Middleware content
 */
function generateAuthMiddleware(components) {
  return `const AuthService = require('../services/AuthService');

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = AuthService.verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    // Try to load full user data if User model is available
    const { User } = req.models || req.app.locals?.models || {};
    if (User) {
      try {
        const fullUser = await AuthService.findUserById(User, decoded.userId);
        if (fullUser) {
          req.user.data = AuthService.sanitizeUser(fullUser);
        }
      } catch (error) {
        // Silently fail - we still have basic user info
      }
    }

    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

${components.roleAuth ? `/**
 * Role-based authorization middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.data?.role || req.user.role;
    
    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: 'User role not found'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if user owns the resource
 */
const checkOwnership = (userIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdParam];
    const currentUserId = req.user.userId || req.user.id;
    
    if (resourceUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};
` : ''}

module.exports = {
  authenticate,
  ${components.roleAuth ? 'authorize,\n  checkOwnership,' : ''}
  // Legacy export for backward compatibility
  _verifyToken: authenticate
};
`;
}

/**
 * Generate Auth Routes content
 */
function generateAuthRoutes(components) {
  return `const router = require('express').Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/auth');

/**
 * Authentication routes
 * Base path: /auth
 */

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
${components.refreshToken ? "router.post('/refresh', AuthController.refresh);" : ''}

// Protected routes
router.get('/me', authenticate, AuthController.getProfile);
${components.changePassword ? "router.post('/change-password', authenticate, AuthController.changePassword);" : ''}
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
`;
}

/**
 * Generate documentation
 */
function generateDocumentation(components) {
  return `# JWT Authentication Setup

## 🎉 Your authentication system is ready!

This authentication system was generated by GreyCodeJS CLI.

## 📡 Available Endpoints

### Public Endpoints

#### Register
\`\`\`http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe"
}
\`\`\`

#### Login
\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

${components.refreshToken ? `#### Refresh Token
\`\`\`http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
\`\`\`
` : ''}

### Protected Endpoints

Add token to headers: \`Authorization: Bearer <your_token>\`

#### Get Profile
\`\`\`http
GET /auth/me
Authorization: Bearer <token>
\`\`\`

${components.changePassword ? `#### Change Password
\`\`\`http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "oldpass123",
  "newPassword": "newpass123"
}
\`\`\`
` : ''}

#### Logout
\`\`\`http
POST /auth/logout
Authorization: Bearer <token>
\`\`\`

## 🔐 Using Auth Middleware

### Protect Routes
\`\`\`javascript
const { authenticate } = require('../middlewares/auth');

router.get('/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});
\`\`\`

${components.roleAuth ? `### Role-Based Access
\`\`\`javascript
const { authenticate, authorize } = require('../middlewares/auth');

router.delete('/admin', 
  authenticate, 
  authorize('admin'),
  (req, res) => {
    // Only admins can access
  }
);
\`\`\`

### Check Ownership
\`\`\`javascript
const { authenticate, checkOwnership } = require('../middlewares/auth');

router.put('/users/:id', 
  authenticate, 
  checkOwnership('id'),
  (req, res) => {
    // Users can only update their own profile
  }
);
\`\`\`
` : ''}

## 🧪 Testing

### With cURL
\`\`\`bash
# Register
curl -X POST http://localhost:3000/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"test123"}'

# Get Profile
curl -X GET http://localhost:3000/auth/me \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## ⚠️ Security Notes

1. **Never commit .env file** - Keep JWT secrets safe
2. **Use strong secrets** - Generated automatically by setup
3. **HTTPS only in production** - Never send tokens over HTTP
4. **Short token expiry** - Default: 1 hour${components.refreshToken ? ', refresh: 7 days' : ''}
5. **Validate input** - Always check email format and password strength

## 📚 Files Created

- \`services/AuthService.js\` - Core authentication logic
- \`controllers/AuthController.js\` - API endpoints
- \`middlewares/auth.js\` - Route protection
- \`routes/auth.js\` - Authentication routes
- \`AUTH_SETUP.md\` - This documentation

---

Generated by GreyCodeJS CLI
`;
}

/**
 * Generate test script
 */
function generateTestScript() {
  return `const fs = require('fs');
const path = require('path');

console.log('\\n🧪 Testing Authentication System...\\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log('✅', name);
    passed++;
  } else {
    console.log('❌', name);
    failed++;
  }
}

// Check files
test('AuthService exists', fs.existsSync(path.join(process.cwd(), 'services/AuthService.js')));
test('AuthController exists', fs.existsSync(path.join(process.cwd(), 'controllers/AuthController.js')));
test('Auth middleware exists', fs.existsSync(path.join(process.cwd(), 'middlewares/auth.js')));
test('Auth routes exist', fs.existsSync(path.join(process.cwd(), 'routes/auth.js')));

// Check dependencies
const pkgPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = require(pkgPath);
  test('bcryptjs installed', pkg.dependencies && pkg.dependencies.bcryptjs);
  test('jsonwebtoken installed', pkg.dependencies && pkg.dependencies.jsonwebtoken);
} else {
  test('package.json exists', false);
}

// Check env
require('dotenv').config();
test('JWT_SECRET configured', !!process.env.JWT_SECRET);

console.log(\`\\n📊 Results: \${passed} passed, \${failed} failed\\n\`);

if (failed === 0) {
  console.log('🎉 All checks passed! Auth system is ready.\\n');
} else {
  console.log('⚠️  Some checks failed. Please review.\\n');
}
`;
}