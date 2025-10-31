// utils/migration-helper.js
const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug } = require('umzug');
const logger = require('./logger');

module.exports = {

    /**
   * Verify database connection (without failing if database doesn't exist)
   * @param {Sequelize} sequelize 
   * @returns {Promise<boolean>}
   */
  async verifyDatabaseConnection(sequelize) {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      if (error.original && error.original.code === 'ER_BAD_DB_ERROR') {
        return false;
      }
      throw error;
    }
  },

  /**
   * Initialize metadata table (only if database exists)
   * @param {Sequelize} sequelize 
   * @returns {Promise<void>}
   */
  async initMetadataTable(sequelize) {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS sequelize_meta (
          name VARCHAR(255) NOT NULL,
          PRIMARY KEY (name),
          UNIQUE KEY name_unique (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await sequelize.query(query);
      logger.debug('Verified metadata table exists');
    } catch (error) {
      logger.error('Failed to initialize metadata table:', error);
      throw error;
    }
  },

  
  /**
   * Verify database connection and initialize metadata table
   * @param {Sequelize} sequelize 
   * @returns {Promise<void>}
   */
  async verifyDatabaseSetup(sequelize) {
    try {
      // First verify we can connect to the database
      await sequelize.authenticate();
      logger.debug('Database connection verified');

      // Check if metadata table exists
      const query = this.getMetadataTableQuery(sequelize);
      const [results] = await sequelize.query(query.checkTable);

      if (results.length === 0) {
        logger.debug('Creating migrations metadata table');
        await sequelize.query(query.createTable);
      }
    } catch (error) {
      logger.error('Database setup verification failed:', error);
      throw error;
    }
  },

  /**
   * Get appropriate SQL queries based on dialect
   * @param {Sequelize} sequelize 
   * @returns {object}
   */
  getMetadataTableQuery(sequelize) {
    switch (sequelize.getDialect()) {
      case 'mysql':
        return {
          checkTable: `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '${sequelize.config.database}' 
            AND table_name = 'sequelize_meta'
          `,
          createTable: `
            CREATE TABLE sequelize_meta (
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (name),
              UNIQUE KEY name_unique (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `
        };
      case 'postgres':
        return {
          checkTable: `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'sequelize_meta'
          `,
          createTable: `
            CREATE TABLE IF NOT EXISTS "sequelize_meta" (
              name VARCHAR(255) PRIMARY KEY NOT NULL,
              UNIQUE (name)
            );
          `
        };
      case 'sqlite':
        return {
          checkTable: `
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name='sequelize_meta'
          `,
          createTable: `
            CREATE TABLE IF NOT EXISTS \`sequelize_meta\` (
              \`name\` VARCHAR(255) NOT NULL UNIQUE,
              PRIMARY KEY (\`name\`)
            );
          `
        };
      case 'mssql':
        return {
          checkTable: `
            SELECT name 
            FROM sys.tables 
            WHERE name = 'sequelize_meta'
          `,
          createTable: `
            CREATE TABLE [sequelize_meta] (
              [name] NVARCHAR(255) NOT NULL,
              PRIMARY KEY ([name]),
              CONSTRAINT [sequelize_meta_name_unique] UNIQUE ([name])
            );
          `
        };
      default:
        throw new Error(`Unsupported dialect: ${sequelize.getDialect()}`);
    }
  },

  /**
   * Get configured Umzug instance
   * @param {Sequelize} sequelize 
   * @returns {Umzug}
   */
  getMigrator(sequelize) {
    return new Umzug({
      migrations: {
        glob: path.join(process.cwd(), 'migrations', '*.js'),
        resolve: ({ name, path: filepath }) => {
          const migration = require(filepath);
          return {
            name,
            up: async () => {
              logger.debug(`Running migration: ${name}`);
              return migration.up(sequelize.getQueryInterface(), Sequelize);
            },
            down: async () => {
              logger.debug(`Reverting migration: ${name}`);
              return migration.down(sequelize.getQueryInterface(), Sequelize);
            }
          };
        }
      },
      storage: {
        async executed() {
          const [results] = await sequelize.query(
            'SELECT name FROM sequelize_meta ORDER BY name'
          );
          return results.map(row => row.name);
        },
        async logMigration({ name }) {
          await sequelize.query(
            'INSERT INTO sequelize_meta (name) VALUES (?)',
            { replacements: [name] }
          );
          logger.debug(`Logged migration: ${name}`);
        },
        async unlogMigration({ name }) {
          await sequelize.query(
            'DELETE FROM sequelize_meta WHERE name = ?',
            { replacements: [name] }
          );
          logger.debug(`Unlogged migration: ${name}`);
        }
      },
      logger: {
        info: (msg) => logger.info(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg) => logger.error(msg),
        debug: (msg) => logger.debug(msg)
      }
    });
  },

  /**
   * Run pending migrations
   * @param {Sequelize} sequelize 
   * @returns {Promise<void>}
   */
  async runMigrations(sequelize) {
    try {
      await this.verifyDatabaseSetup(sequelize);
      const umzug = this.getMigrator(sequelize);
      
      const pending = await umzug.pending();
      if (pending.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Running ${pending.length} pending migration(s)...`);
      await umzug.up();
      logger.success('Migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  },

  /**
   * Undo the last migration
   * @param {Sequelize} sequelize 
   * @returns {Promise<void>}
   */
  async undoMigration(sequelize) {
    try {
      await this.verifyDatabaseSetup(sequelize);
      const umzug = this.getMigrator(sequelize);
      
      const executed = await umzug.executed();
      if (executed.length === 0) {
        logger.warn('No migrations to undo');
        return;
      }

      logger.info('Undoing last migration...');
      await umzug.down();
      logger.success('Migration undone successfully');
    } catch (error) {
      logger.error('Failed to undo migration:', error);
      throw error;
    }
  },

  /**
   * Create a new migration file
   * @param {string} name 
   * @param {object} options 
   * @returns {Promise<string>}
   */
  async createMigrationFile(name, options = {}) {
    const migrationsPath = path.resolve(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsPath)) {
      fs.mkdirSync(migrationsPath, { recursive: true });
      logger.debug(`Created migrations directory: ${migrationsPath}`);
    }

    const timestamp = new Date().getTime();
    const filename = `${timestamp}-${name}.js`;
    const filepath = path.join(migrationsPath, filename);

    const content = options.model 
      ? this.generateModelMigration(name.toLowerCase(), options.fields || {})
      : this.generateGenericMigration();

    fs.writeFileSync(filepath, content);
    logger.info(`Created migration file: ${filename}`);
    return filepath;
  },

  /**
   * Generate model migration template
   * @param {string} modelName 
   * @param {object} fields 
   * @returns {string}
   */
  generateModelMigration(modelName, fields) {
    const columns = Object.entries(fields)
      .map(([name, def]) => this.generateColumnDefinition(name, def))
      .join(',\n    ');

    return `'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('${modelName}', {
${columns}
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('${modelName}');
  }
};`;
  },

  /**
   * Generate generic migration template
   * @returns {string}
   */
  generateGenericMigration() {
    return `'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add migration logic here
  },

  down: async (queryInterface, Sequelize) => {
    // Add rollback logic here
  }
};`;
  },

  /**
   * Generate column definition
   * @param {string} name 
   * @param {object|string} definition 
   * @returns {string}
   */
  generateColumnDefinition(name, definition) {
    if (typeof definition === 'string') {
      return `${name}: { type: Sequelize.${definition.toUpperCase()} }`;
    }

    const props = [];
    if (definition.type) {
      props.push(`type: Sequelize.${definition.type.toUpperCase()}`);
    }
    if (definition.allowNull !== undefined) {
      props.push(`allowNull: ${definition.allowNull}`);
    }
    if (definition.primaryKey) {
      props.push('primaryKey: true');
    }
    if (definition.autoIncrement) {
      props.push('autoIncrement: true');
    }
    if (definition.defaultValue !== undefined) {
      props.push(`defaultValue: ${JSON.stringify(definition.defaultValue)}`);
    }
    if (definition.references) {
      props.push(`references: {
        model: '${definition.references.model}',
        key: '${definition.references.key || 'id'}'
      }`);
    }

    return `${name}: { ${props.join(', ')} }`;
  }
};