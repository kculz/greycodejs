# GreyCode.js CLI Documentation

GreyCode.js CLI provides a robust command-line interface to manage and streamline your development workflow with Sequelize and Express.js. Below is a guide to all the commands currently supported.

---

## Installation

To install and use GreyCode.js CLI:

```bash
npm install -g greycodejs
```

---

## Commands

### 1. **create-model**

Generate a new Sequelize model.

**Usage:**
```bash
gray.js create-model <name>
```

**Description:**
Creates a Sequelize model file with a default structure.

- `<name>`: The name of the model (e.g., `User`).

**Example:**
```bash
gray.js create-model User
```
Creates a file `User.js` in the `models/` directory.

---

### 2. **migrate**

Sync all models with the database.

**Usage:**
```bash
gray.js migrate
```

**Description:**
Reads all models and synchronizes them with the database.

---

### 3. **create-controller**

Create a new controller with basic CRUD operations.

**Usage:**
```bash
gray.js create-controller <name>
```

**Description:**
Creates a controller file with methods for Create, Read, Update, and Delete (CRUD) operations.

- `<name>`: The name of the resource (e.g., `User`).

**Example:**
```bash
gray.js create-controller User
```
Creates a file `UserController.js` in the `controllers/` directory.

---

### 4. **create-route**

Generate a new route file for a specified controller.

**Usage:**
```bash
gray.js create-route <name>
```

**Description:**
Creates a route file and links it to the specified controller.

- `<name>`: The name of the controller (e.g., `User`).

**Example:**
```bash
gray.js create-route User
```
Creates a file `user.js` in the `routes/` directory.

---

### 5. **migrate:undo**

Undo the migration for a specific model by dropping its table.

**Usage:**
```bash
gray.js migrate:undo <model>
```

**Description:**
Drops the table associated with the specified model.

- `<model>`: The name of the model (e.g., `User`).

**Example:**
```bash
gray.js migrate:undo User
```

---

### 6. **migrate:undo:all**

Rollback database to its initial state by dropping all tables.

**Usage:**
```bash
gray.js migrate:undo:all
```

**Description:**
Drops all tables in the database.

---

### 7. **make-seed**

Generate a JSON file for seeding or seed data into the database.

**Usage:**
```bash
gray.js make-seed <model> [options]
```

**Options:**
- `--seed`: Seeds the database with data from the generated JSON file.
- `--count <number>`: Number of records to generate (default: 10).

**Description:**
Creates seed data for a specified model or seeds the database directly.

**Examples:**
1. Generate seed data:
   ```bash
   gray.js make-seed User --count 5
   ```
   Creates a file `user-seed.json` in the `seeds/` directory.

2. Seed data into the database:
   ```bash
   gray.js make-seed User --seed
   ```
   Seeds the data from `user-seed.json` into the `User` table.

---

### 8. **run**

Start the GreyCode.js application.

**Usage:**
```bash
gray.js run
```

**Description:**
Runs the main application.

---

### 9. **list-commands**

List all available CLI commands.

**Usage:**
```bash
gray.js list-commands
```

**Description:**
Displays all available commands in a table format.

---

## Additional Notes

- For more details about each command, use the `--help` option:
  ```bash
  gray.js <command> --help
  ```

- Ensure the following directory structure exists for proper functionality:
  ```plaintext
  /config/database.js
  /models/
  /controllers/
  /routes/
  /seeds/
  ```

- Customize and expand the templates in `models`, `controllers`, and `routes` as needed for your application.

---

## Troubleshooting

If you encounter issues:

1. Ensure the database connection in `/config/database.js` is properly configured.
2. Verify that the required directories exist.
3. Check for any missing dependencies:
   ```bash
   npm install
   ```

