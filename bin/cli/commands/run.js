const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('run')
    .description('Start the GreyCode.js application')
    .option('--watch', 'Run the application with nodemon for live reloading')
    .action((options) => {
      if (options.watch) {
        const nodemon = require('nodemon');
        const appPath = path.resolve(process.cwd(), 'app.js');

        console.log(chalk.blue('Running the application with nodemon...'));
        nodemon({
          script: appPath,
          ext: 'js json',
          watch: [
            path.resolve(process.cwd(), './')
          ],
        });

        nodemon
          .on('start', () => {
            console.log(chalk.green('Application has started.'));
          })
          .on('restart', (files) => {
            console.log(chalk.blue('Application restarted due to changes in:'), files);
          })
          .on('quit', () => {
            console.log(chalk.yellow('Application has quit.'));
            process.exit();
          });
      } else {
        console.log(chalk.blue('Running the application...'));
        require(path.resolve(process.cwd(), 'app.js'));
      }
    });
};