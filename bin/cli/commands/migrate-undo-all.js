const path = require('path');
const { Sequelize } = require('sequelize');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('migrate:undo:all')
    .description('Undo all migrations (rollback database to initial state)')
    .action(async () => {
      const configPath = path.resolve(process.cwd(), 'config/database.js');
      const sequelize = new Sequelize(require(configPath));

      try {
        console.log(chalk.blue('Reverting all migrations...'));
        await sequelize.getQueryInterface().dropAllTables();
        console.log(chalk.green('Successfully reverted all migrations!'));
      } catch (error) {
        console.error(chalk.red('Error undoing all migrations:'), error.message);
      } finally {
        await sequelize.close();
      }
    });
};