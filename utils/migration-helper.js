// utils/migration-helper.js
const path = require('path');
const fs = require('fs'); // ✅ FIXED: Added missing import
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
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
        CREATE TABLE IF NOT EXISTS SequelizeMeta (
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
            AND table_name = 'SequelizeMeta'
          `,
          createTable: `
            CREATE TABLE IF NOT EXISTS SequelizeMeta (
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
            WHERE table_name = 'SequelizeMeta'
          `,
          createTable: `
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
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
            WHERE type='table' AND name='SequelizeMeta'
          `,
          createTable: `
            CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
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
            WHERE name = 'SequelizeMeta'
          `,
          createTable: `
            CREATE TABLE [SequelizeMeta] (
              [name] NVARCHAR(255) NOT NULL,
              PRIMARY KEY ([name]),
              CONSTRAINT [SequelizeMeta_name_unique] UNIQUE ([name])
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
    const migrationsPath = path.join(process.cwd(), 'migrations');
    
    // Ensure migrations directory exists
    if (!fs.existsSync(migrationsPath)) {
      fs.mkdirSync(migrationsPath, { recursive: true });
      logger.debug(`Created migrations directory: ${migrationsPath}`);
    }

    return new Umzug({
      migrations: {
        glob: path.join(migrationsPath, '*.js'),
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
      storage: new SequelizeStorage({ 
        sequelize,
        tableName: 'SequelizeMeta'
      }),
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
      const executed = await umzug.up();
      
      // ✅ FIXED: Use logger.info instead of logger.success
      logger.info(`✅ Successfully executed ${executed.length} migration(s)`);
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
      logger.info('✅ Migration undone successfully');
    } catch (error) {
      logger.error('Failed to undo migration:', error);
      throw error;
    }
  },

  /**
   * Get migration status
   * @param {Sequelize} sequelize 
   * @returns {Promise<object>}
   */
  async getMigrationStatus(sequelize) {
    try {
      await this.verifyDatabaseSetup(sequelize);
      const umzug = this.getMigrator(sequelize);
      
      const [pending, executed] = await Promise.all([
        umzug.pending(),
        umzug.executed()
      ]);

      return {
        pending: pending.map(m => m.name),
        executed: executed.map(m => m.name)
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
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
      ? this.generateModelMigration(name, options.fields || {})
      : this.generateGenericMigration(name);

    fs.writeFileSync(filepath, content);
    logger.info(`✅ Created migration file: ${filename}`);
    return filepath;
  },

  /**
   * Generate model migration template
   * @param {string} name 
   * @param {object} fields 
   * @returns {string}
   */
  generateModelMigration(name, fields) {
    const tableName = name.toLowerCase() + 's'; // Simple pluralization
    
    let columns = `      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }`;

    // Add custom fields if provided
    if (Object.keys(fields).length > 0) {
      const customFields = Object.entries(fields)
        .map(([fieldName, fieldDef]) => this.generateColumnDefinition(fieldName, fieldDef))
        .join(',\n      ');
      columns = customFields + ',\n      ' + columns;
    }

    return `'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('${tableName}', {
${columns}
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('${tableName}');
  }
};`;
  },

  /**
   * Generate generic migration template
   * @param {string} name 
   * @returns {string}
   */
  generateGenericMigration(name) {
    return `'use strict';

/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add migration logic here
    // Example: await queryInterface.addColumn('users', 'email', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });
  },

  down: async (queryInterface, Sequelize) => {
    // Add rollback logic here
    // Example: await queryInterface.removeColumn('users', 'email');
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
    if (definition.unique) {
      props.push('unique: true');
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