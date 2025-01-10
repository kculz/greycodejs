// core/database.js
const { Sequelize } = require('sequelize');
const config = require('../config/database');

async function ensureDatabaseExists() {
  const { dialect, database, username, password, host } = config;

  if (dialect === 'sqlite') {
    // SQLite doesn't require database creation; it creates the file automatically
    console.log(`Using SQLite database at "${database}".`);
    return;
  }

  const adminSequelize = new Sequelize('', username, password, {
    host,
    dialect,
    logging: false, // Disable logging for cleaner output
  });

  try {
    console.log(`Checking if database "${database}" exists for dialect "${dialect}"...`);
    
    if (dialect === 'mysql') {
      // MySQL-specific syntax
      await adminSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    } else if (dialect === 'postgres') {
      // PostgreSQL-specific syntax
      const result = await adminSequelize.query(
        `SELECT 1 FROM pg_database WHERE datname = '${database}';`
      );

      if (result[0].length === 0) {
        await adminSequelize.query(`CREATE DATABASE "${database}";`);
        console.log(`Database "${database}" created successfully.`);
      } else {
        console.log(`Database "${database}" already exists.`);
      }
    }
  } catch (err) {
    console.error(`Error while ensuring database exists: ${err.message}`);
    throw err; // Rethrow to handle it in the main flow
  } finally {
    await adminSequelize.close();
  }
}

(async () => {
  const { dialect, database, username, password, host } = config;

  try {
    // Ensure the database exists (for MySQL and PostgreSQL)
    await ensureDatabaseExists();

    // Connect to the actual database
    const sequelize = new Sequelize(database, username, password, {
      host,
      dialect,
      logging: console.log,
    });

    await sequelize.authenticate();
    console.log(`Connected to the ${dialect} database "${database}".`);

    module.exports = sequelize;
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
    process.exit(1); // Exit the process with failure code
  }
})();
