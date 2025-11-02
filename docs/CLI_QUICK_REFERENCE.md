# GreyCodeJS CLI - Quick Reference Card

> One-page reference for all CLI commands. For detailed documentation, see `CLI_COMMANDS.md`

## 📦 Installation & Setup

```bash
# Install globally
npm install -g greycodejs-installer

# Create new project
greycodejs-installer new my-project
cd my-project
npm install

# Setup database
npm run cli -- setup-db
```

---

## 🎯 Command Syntax

```bash
# Local project (recommended)
npm run cli -- <command> [options]

# Global (if installed globally)
greycodejs <command> [options]
```

---

## 🏗️ Resource Generation

| Command | Description | Example |
|---------|-------------|---------|
| `create-model <name>` | Create database model | `npm run cli -- create-model User` |
| `create-controller <name>` | Create controller | `npm run cli -- create-controller User` |
| `create-route <name>` | Create route file | `npm run cli -- create-route user` |
| `create-resource <name>` | Create all at once ⚡ | `npm run cli -- create-resource Post` |

**Quick Start:**
```bash
# One command to rule them all! 👑
npm run cli -- create-resource Product
# Creates: Model + Controller + Routes
```

---

## 💾 Database Commands

| Command | Description | Example |
|---------|-------------|---------|
| `setup-db` | Interactive DB config | `npm run cli -- setup-db` |
| `migrate` | Run migrations | `npm run cli -- migrate` |
| `migrate --force` | Force sync (⚠️ dev only) | `npm run cli -- migrate --force` |
| `migrate:status` | Check migration status | `npm run cli -- migrate:status` |
| `migrate:undo <model>` | Drop one table | `npm run cli -- migrate:undo User` |
| `migrate:undo:all` | Drop all tables (⚠️ nuclear) | `npm run cli -- migrate:undo:all` |

**Typical Flow:**
```bash
npm run cli -- setup-db           # 1. Configure
npm run cli -- create-model User  # 2. Create model
# Edit models/User.js              # 3. Add fields
npm run cli -- migrate            # 4. Apply to DB
```

---

## 🌱 Seeding Commands

| Command | Description | Example |
|---------|-------------|---------|
| `make-seed <model>` | Generate seed JSON | `npm run cli -- make-seed User` |
| `make-seed <model> --count <n>` | Custom count | `npm run cli -- make-seed User --count 50` |
| `make-seed <model> --seed` | Insert into DB | `npm run cli -- make-seed User --seed` |

**Workflow:**
```bash
# 1. Generate fake data
npm run cli -- make-seed User --count 20

# 2. Review/edit seeds/user-seed.json

# 3. Insert into database
npm run cli -- make-seed User --seed
```

---

## 🔧 Service & Application

| Command | Description | Example |
|---------|-------------|---------|
| `make-service <name>` | Create service class | `npm run cli -- make-service Auth` |
| `run` | Start application | `npm run cli -- run` |
| `run --watch` | Start with auto-reload | `npm run cli -- run --watch` |

---

## 🛠️ Setup & Utility

| Command | Description | Example |
|---------|-------------|---------|
| `setup-prisma` | Initialize Prisma | `npm run cli -- setup-prisma` |
| `list-commands` | Show all commands | `npm run cli -- list-commands` |
| `<command> --help` | Command help | `npm run cli -- migrate --help` |
| `--version` | Show version | `npm run cli -- --version` |

---

## 🚀 Common Workflows

### New Feature

```bash
npm run cli -- create-resource Feature
# Edit models/Feature.js
npm run cli -- migrate
# Register routes in app.js
npm run dev
```

### Database Reset

```bash
npm run cli -- migrate:undo:all
npm run cli -- migrate
npm run cli -- make-seed User --seed
```

### Fresh Project Setup

```bash
npm install
npm run cli -- setup-db
npm run cli -- migrate
npm run cli -- make-seed User --count 10 --seed
npm run dev
```

### Add Authentication

```bash
npm run cli -- create-model User
npm run cli -- make-service Auth
npm run cli -- create-controller Auth --no-crud
npm run cli -- create-route auth
npm run cli -- migrate
```

---

## 📋 Quick Examples

### Create Blog

```bash
npm run cli -- create-resource Post
npm run cli -- create-resource Comment
npm run cli -- create-resource Category
npm run cli -- migrate
npm run cli -- make-seed Post --count 20 --seed
npm run cli -- make-seed Comment --count 100 --seed
```

### E-commerce

```bash
npm run cli -- create-resource Product
npm run cli -- create-resource Order
npm run cli -- create-resource Customer
npm run cli -- make-service Cart
npm run cli -- make-service Payment
npm run cli -- migrate
```

---

## ⚠️ Important Warnings

| Command | Warning |
|---------|---------|
| `migrate --force` | 🚨 Drops ALL tables! Dev only! |
| `migrate:undo:all` | 🚨 Deletes ALL data! Dev only! |
| `migrate:undo <model>` | ⚠️ Drops table and data! |

**Never use in production!**

---

## 💡 Pro Tips

### 1. Use create-resource
```bash
# ❌ Three separate commands
npm run cli -- create-model User
npm run cli -- create-controller User
npm run cli -- create-route user

# ✅ One command
npm run cli -- create-resource User
```

### 2. Check status before deploying
```bash
npm run cli -- migrate:status
# Should show: Pending: 0
```

### 3. Review seeds before inserting
```bash
npm run cli -- make-seed User --count 10
# Edit seeds/user-seed.json
npm run cli -- make-seed User --seed
```

### 4. Use services for business logic
```bash
npm run cli -- make-service Email
# Put email logic in services/EmailService.js
# Use in controllers
```

### 5. Always backup before migrations
```bash
# MySQL
mysqldump -u root -p mydb > backup.sql

# Then migrate
npm run cli -- migrate
```

---

## 🐛 Troubleshooting

### Command not found
```bash
# Check installation
npm run cli -- --version

# Reinstall if needed
npm install
```

### Database connection failed
```bash
# Reconfigure
npm run cli -- setup-db

# Check database is running
sudo systemctl status mysql
```

### Migration failed
```bash
# Check status
npm run cli -- migrate:status

# View errors in logs
cat logs/error.log
```

### Model already exists
```bash
# Delete and recreate
rm models/User.js
npm run cli -- create-model User
```

---

## 📚 Documentation Links

- **Full Command Reference**: `CLI_COMMANDS.md`
- **Database Setup**: `DATABASE.md`
- **Model System**: `MODEL_SYSTEM.md`
- **CLI Setup & Fixes**: `CLI_SETUP_FIX.md`
- **Logger System**: `LOGGER_IMPORT_FIXES.md`

---

## 🎓 Supported Technologies

### ORMs
- ✅ Sequelize (MySQL, PostgreSQL, SQLite, MSSQL)
- ✅ Mongoose (MongoDB)
- ✅ Prisma (PostgreSQL, MySQL, SQLite, MongoDB, etc.)

### Databases
- ✅ MySQL
- ✅ PostgreSQL
- ✅ SQLite
- ✅ MongoDB
- ✅ Microsoft SQL Server

---

## 📦 NPM Scripts (Optional Aliases)

Add to your `package.json` for shorter commands:

```json
{
  "scripts": {
    "cli": "node bin/cli.js",
    "db:setup": "npm run cli -- setup-db",
    "db:migrate": "npm run cli -- migrate",
    "db:reset": "npm run cli -- migrate:undo:all && npm run cli -- migrate",
    "make:resource": "npm run cli -- create-resource",
    "make:model": "npm run cli -- create-model",
    "make:controller": "npm run cli -- create-controller"
  }
}
```

**Usage:**
```bash
npm run make:resource User
npm run db:migrate
npm run db:reset
```

---

## 🎯 Command Priority Guide

**Start Here:**
1. `setup-db` - Configure your database
2. `create-resource` - Generate your features
3. `migrate` - Apply to database
4. `make-seed --seed` - Add test data
5. `run --watch` - Start developing

**Use Regularly:**
- `migrate:status` - Check migrations
- `make-seed` - Generate test data
- `list-commands` - Remind yourself of commands

**Use Carefully:**
- `migrate:undo` - Only in development
- `migrate:undo:all` - Only when resetting

**Never in Production:**
- `migrate --force` 🚨
- `migrate:undo:all` 🚨

---

## 🆘 Getting Help

```bash
# List all commands
npm run cli -- list-commands

# Help for specific command
npm run cli -- <command> --help

# Examples:
npm run cli -- create-model --help
npm run cli -- migrate --help
npm run cli -- make-seed --help
```

---

## ✅ Quick Start Checklist

- [ ] `npm install -g greycodejs-installer`
- [ ] `greycodejs-installer new my-project`
- [ ] `cd my-project && npm install`
- [ ] `npm run cli -- setup-db`
- [ ] `npm run cli -- create-resource User`
- [ ] `npm run cli -- migrate`
- [ ] Register routes in app.js
- [ ] `npm run dev`
- [ ] Test: `curl http://localhost:3000/api/users`

---

## 🎉 You're Ready!

Print this page and keep it handy while developing! For full documentation with examples and troubleshooting, see **CLI_COMMANDS.md**.

**Happy coding! 🚀**

---

## Version Info

**GreyCodeJS CLI v0.0.2**  
Last Updated: 2025  
Full Documentation: [GitHub Repository](https://github.com/kculz/greycodejs)