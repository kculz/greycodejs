# GreyCode.js Framework Structure Documentation

The GreyCode.js framework is designed to streamline the development of applications using Sequelize and Express.js. This document provides an overview of the folder structure, its purpose, and how to work with it effectively. While the structure is customizable, adhering to the default layout ensures smoother functionality.

---

Installation

To install the GreyCode.js framework, use the following command:
```bash
npm install https://github.com/kculz/greycodejs
```
This command installs the framework directly from the GitHub repository.

## Folder Structure Overview

Here is the default folder structure of a GreyCode.js project:

```plaintext
bin/            # Command-line entry points for the application
config/         # Configuration files (e.g., database settings)
controllers/    # Controller files for handling business logic
core/           # Core framework utilities and functionalities
middlewares/    # Middleware functions for request/response handling
models/         # Sequelize models for database interaction
node_modules/   # Node.js dependencies
public/         # Public assets (e.g., static files like images, CSS, JS)
routes/         # Route definitions for mapping URLs to controllers
seeds/          # Seed files for populating the database with initial data
templates/      # Templates for generating code or HTML
.env            # Environment variable configuration
app.js          # Main application entry point
package.json    # Node.js package configuration
README.md       # Documentation for the project
```

### 1. **/bin**
- Contains scripts for starting and managing the application.
- Example: Custom server startup scripts.

### 2. **/config**
- Holds configuration files.
- **`database.js`**: Contains database connection settings (required).

### 3. **/controllers**
- Contains controller files for handling application logic.
- Each controller corresponds to a specific model or feature and includes CRUD operations by default.
- Example: `UserController.js` for user-related operations.

### 4. **/core**
- Core functionality of the framework, including essential utilities and base classes.
- Developers can extend the framework by adding custom functionality here.

### 5. **/middleware**
- Contains middleware functions to process requests and responses.
- Example: Authentication, logging, or validation middleware.

### 6. **/models**
- Contains Sequelize model definitions.
- Each file represents a table in the database.
- Example: `User.js` defines the schema and associations for the `User` table.

### 7. **/public**
- Stores static assets like images, CSS, and JavaScript files.
- These files are served directly to the client.

### 8. **/routes**
- Contains route files that map endpoints to controllers.
- Example: `user.js` defines routes for user-related operations.

### 9. **/seeds**
- Contains seed files for populating the database with initial or test data.
- Example: `user-seed.json` holds seed data for the `User` table.

### 10. **/templates**
- Contains templates for generating models, controllers, and routes.
- These templates can be customized to fit your specific requirements.

---

## Root-Level Files

### 1. **.env**
- Environment variables for the application.
- Example: Database credentials, port numbers.

### 2. **.env.example**
- A sample environment configuration file for reference.

### 3. **app.js**
- The main entry point for the application.
- Initializes the server, middleware, and routes.

### 4. **package.json**
- Node.js dependencies and scripts.
- Add new dependencies or scripts as needed for the project.

### 5. **README.md**
- Documentation about the project.
- Provide information on how to set up and run the application.

---

## How It Works

### 1. **Starting the Application**
Run the following command to start the application:

```bash
gray.js run [--watch]
```

- Use the `--watch` flag to enable `nodemon` for automatic restarts on file changes.

### 2. **Adding a Model**
Create a new model using the CLI:

```bash
gray.js create-model <name>
```

The generated model will appear in the `/models` directory. Customize its fields and associations as needed.

### 3. **Adding a Controller**
Generate a controller for handling logic:

```bash
gray.js create-controller <name>
```

Controllers are stored in the `/controllers` directory. Use these to define your application's business logic.

### 4. **Defining Routes**
Generate a route file:

```bash
gray.js create-route <name>
```

Routes are stored in the `/routes` directory and link HTTP endpoints to controller methods.

### 5. **Seeding the Database**
Create or apply seed data:

```bash
gray.js make-seed <model> [--count <number>] [--seed]
```

Use seed files in the `/seeds` directory to populate your database.

---

## Customizing the Structure

You can modify the folder structure to suit your needs. For example:

1. Rename or reorganize directories.
2. Add new directories for additional features, such as `/services` for business logic or `/tests` for unit tests.

Update your configuration files and scripts to reflect the changes.

---

## Best Practices

1. **Separation of Concerns**:
   - Keep controllers focused on application logic.
   - Use middleware for cross-cutting concerns like authentication and validation.
   
2. **Modularity**:
   - Group related files (e.g., models, controllers, routes) by feature.

3. **Environment Variables**:
   - Store sensitive information in the `.env` file.

4. **Version Control**:
   - Commit the `.env.example` file, but exclude `.env` using `.gitignore`.

---

This structure is designed to be flexible and scalable, making it suitable for small projects as well as large applications. Modify it as needed to fit your specific use case!



