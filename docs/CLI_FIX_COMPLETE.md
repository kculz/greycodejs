# CLI Fix - Quick Start Guide

## 🚨 The Problem

After separating CLI commands into individual files, commands stopped working:
```bash
$ npm run cli -- create-controller User
# Error: Command not found
```

## ✅ The Solution (Quick Fix)

### Option 1: Automated Fix (Recommended)

Run the automated fixer:

```bash
# Make the fixer executable
chmod +x scripts/fix-cli.js

# Run it
node scripts/fix-cli.js
```

This will:
- ✅ Check/create `bin/cli.js`
- ✅ Verify commands directory
- ✅ Fix `package.json` configuration
- ✅ Install missing dependencies
- ✅ Test CLI execution

### Option 2: Manual Fix (3 Steps)

**Step 1: Create/Update bin/cli.js**

Make sure `bin/cli.js` exists with this content:

```javascript
#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('greycodejs')
  .description('GreyCodeJS CLI')
  .version('0.0.2');

const commandsPath = path.join(__dirname, 'cli', 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  commandFiles.forEach(file => {
    try {
      const commandModule = require(path.join(commandsPath, file));
      if (typeof commandModule === 'function') {
        commandModule(program);
      }
    } catch (error) {
      console.error(chalk.red(`Failed to load ${file}:`), error.message);
    }
  });
}

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

**Step 2: Make Executable**

```bash
chmod +x bin/cli.js
```

**Step 3: Update package.json**

Ensure these lines exist:

```json
{
  "scripts": {
    "cli": "node bin/cli.js"
  },
  "bin": {
    "greycodejs": "./bin/cli.js"
  }
}
```

**Step 4: Install Dependencies**

```bash
npm install chalk@4.1.2 commander@12.1.0
```

## 🧪 Test It Works

```bash
# Test 1: Show version
npm run cli -- --version

# Test 2: List commands
npm run cli -- list-commands

# Test 3: Create a controller
npm run cli -- create-controller Test

# Expected output:
# ✅ Controller "TestController" created successfully!
```

## 📁 Required File Structure

```
your-project/
├── bin/
│   ├── cli.js                    ⭐ Main entry point
│   └── cli/
│       └── commands/
│           ├── create-controller.js
│           ├── create-model.js
│           ├── create-route.js
│           ├── create-resource.js
│           ├── list-commands.js
│           ├── make-seed.js
│           ├── make-service.js
│           ├── migrate.js
│           ├── migrate-status.js
│           ├── migrate-undo.js
│           ├── migrate-undo-all.js
│           ├── run.js
│           ├── setup-db.js
│           └── setup-prisma.js
├── package.json
└── ...
```

## 🎯 All Available Commands

After fixing, these commands should work:

```bash
# Resource Generation
npm run cli -- create-model User
npm run cli -- create-controller User
npm run cli -- create-route user
npm run cli -- create-resource Post        # Creates model, controller & route

# Database Operations
npm run cli -- setup-db                    # Interactive database setup
npm run cli -- migrate                     # Run migrations
npm run cli -- migrate:status              # Check migration status
npm run cli -- migrate:undo <model>        # Undo specific migration
npm run cli -- migrate:undo:all            # Undo all migrations

# Seeding
npm run cli -- make-seed User --count 10   # Generate seed JSON
npm run cli -- make-seed User --seed       # Insert seed data

# Services
npm run cli -- make-service Auth           # Create service layer

# Application
npm run cli -- run                         # Start app
npm run cli -- run --watch                 # Start with nodemon

# Setup
npm run cli -- setup-prisma                # Initialize Prisma

# Help
npm run cli -- list-commands               # List all commands
npm run cli -- <command> --help            # Help for specific command
```

## 🐛 Still Not Working?

### Issue: Command files not found

**Check:**
```bash
ls -la bin/cli/commands/
```

Should show `.js` files. If empty, your command files might be in the wrong location.

**Fix:**
Move command files to `bin/cli/commands/`

### Issue: "Cannot find module 'chalk'"

**Fix:**
```bash
npm install chalk@4.1.2
```

### Issue: "Permission denied"

**Fix:**
```bash
chmod +x bin/cli.js
```

### Issue: Commands work locally but not globally

**Fix:**
```bash
# If installed globally
npm unlink -g greycodejs
npm link

# Or just use npm run cli
npm run cli -- create-model User
```

### Issue: Syntax errors in command files

**Check each command file has:**
```javascript
module.exports = (program) => {
  program
    .command('command-name <arg>')
    .description('Description')
    .action((arg) => {
      // Implementation
    });
};
```

## 📊 Run Diagnostics

For detailed diagnostics, run:

```bash
node scripts/fix-cli.js
```

This will:
- Check all CLI components
- Fix common issues automatically
- Report what needs manual attention

## ✨ Success Indicators

You know it's working when you see:

```bash
$ npm run cli -- list-commands

Available Commands:

create-model              Generate a new model for the active ORM
create-controller         Create a new controller with basic CRUD operations
create-route              Generate a new route file for a specified controller
create-resource           Generate all resources (model, controller, route)
migrate                   Run migrations for the active ORM
...

✅ CLI is fully functional!
```

## 🎓 Usage Examples

### Create a complete resource (Model + Controller + Routes)

```bash
# One command creates everything!
npm run cli -- create-resource Product

# Output:
# ✅ Model Product created
# ✅ Controller ProductController created  
# ✅ Route product.js created
```

Then just register the route in your app:

```javascript
// app.js
const productRouter = require('./routes/product');
app.use('/api/products', productRouter);
```

### Set up database with interactive wizard

```bash
npm run cli -- setup-db

# Follow prompts:
# ? Select your ORM: sequelize
# ? Database type: mysql
# ? Database host: localhost
# ? Database port: 3306
# ? Database name: myapp
# ? Username: root
# ? Password: ****
```

### Create and run migrations

```bash
# Create model
npm run cli -- create-model User

# Edit the model, then migrate
npm run cli -- migrate

# Check status
npm run cli -- migrate:status
```

## 📚 Additional Resources

- **Full Documentation**: See `CLI_SETUP_FIX.md`
- **Command Reference**: Run `npm run cli -- list-commands`
- **Model System**: See `MODEL_SYSTEM.md`
- **Database Setup**: See `DATABASE.md`

## 🎉 You're Done!

Your CLI should now be fully functional. Try creating a test controller:

```bash
npm run cli -- create-controller Welcome
```

If you see:
```
✅ Controller "WelcomeController" created successfully!
```

You're all set! 🚀