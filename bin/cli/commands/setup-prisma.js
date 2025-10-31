const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('setup-prisma')
    .description('Initialize Prisma in the project')
    .action(() => {
      const { execSync } = require('child_process');
      try {
        console.log(chalk.blue('Setting up Prisma...'));
        execSync('npx prisma init', { stdio: 'inherit' });
        console.log(chalk.green('Prisma initialized successfully'));
        console.log(chalk.blue('Next steps:'));
        console.log('1. Configure your database in prisma/schema.prisma');
        console.log('2. Run "greycodejs migrate" to apply migrations');
      } catch (error) {
        console.error(chalk.red('Prisma setup failed:'), error);
      }
    });
};