const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('migrate')
    .description('Run migrations for the active ORM')
    .option('--force', 'Force sync models (drops existing tables)', false)
    .action(async (options) => {
      const { activeORM } = require('../../../config/orm');
      const logger = require('../../../utils/logger');
      const db = require('../../../core/database');
      const migrationHelper = require('../../../utils/migration-helper');
      
      try {
        switch (activeORM) {
          case 'sequelize':
            const sequelize = await db.initializeDatabase();
            try {
              if (options.force) {
                logger.warn('Forcing model synchronization...');
                await sequelize.sync({ force: true });
                logger.info('Models force-synced successfully');
              }
              
              await migrationHelper.runMigrations(sequelize);
            } finally {
              await sequelize.close();
            }
            break;
            
          case 'mongoose':
            logger.info('Mongoose does not require migrations - schema updates are automatic');
            break;
            
          case 'prisma':
            const { execSync } = require('child_process');
            logger.info('Running Prisma migrations...');
            execSync('npx prisma migrate dev', { stdio: 'inherit' });
            logger.success('Prisma migrations completed successfully');
            break;
            
          default:
            throw new Error(`Unsupported ORM: ${activeORM}`);
        }
      } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
      }
    });
};