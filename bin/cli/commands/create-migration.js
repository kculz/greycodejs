const chalk = require('chalk');
const migrationHelper = require('../../../utils/migration-helper');

/**
 * Register create-migration command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('create-migration <name>')
    .description('Create a new database migration file')
    .option('--model', 'Generate migration for a model')
    .option('--table <tableName>', 'Specify table name')
    .action(async (name, options) => {
      try {
        console.log(chalk.blue(`Creating migration: ${name}...`));

        const migrationOptions = {
          model: options.model,
          table: options.table
        };

        const filepath = await migrationHelper.createMigrationFile(name, migrationOptions);
        
        console.log(chalk.green(`\n✅ Migration created successfully!`));
        console.log(chalk.gray(`   Location: ${filepath}`));
        console.log(chalk.blue('\n📝 Next steps:'));
        console.log(chalk.gray('   1. Edit the migration file to add your changes'));
        console.log(chalk.gray('   2. Run: npm run cli -- migrate'));
        
      } catch (error) {
        console.error(chalk.red('\n❌ Failed to create migration:'), error.message);
        process.exit(1);
      }
    });
};