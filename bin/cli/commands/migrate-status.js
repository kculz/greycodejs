const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('migrate:status')
    .description('Show migration status')
    .action(async () => {
      const { activeORM } = require('../../config/orm');
      
      if (activeORM !== 'sequelize') {
        console.log(chalk.blue(`Migration status not available for ${activeORM}`));
        return;
      }

      const { Sequelize } = require('sequelize');
      const sequelizeConfig = require('../../../config/database');
      const sequelize = new Sequelize(sequelizeConfig);
      const migrationHelper = require('../../../utils/migration-helper');
      const umzug = migrationHelper.getMigrator(sequelize);

      const [pending, executed] = await Promise.all([
        umzug.pending(),
        umzug.executed()
      ]);

      console.log(chalk.blue('\nMigration Status:'));
      console.log(chalk.green(`Executed: ${executed.length}`));
      console.log(chalk.yellow(`Pending: ${pending.length}`));

      if (pending.length > 0) {
        console.log(chalk.yellow('\nPending Migrations:'));
        pending.forEach(m => console.log(`- ${m.name}`));
      }

      await sequelize.close();
    });
};