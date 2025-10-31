const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('list-commands')
    .description('List all available CLI commands')
    .action(() => {
      console.log('\nAvailable Commands:\n');

      const commands = program.commands.map((cmd) => ({
        name: cmd.name(),
        description: cmd.description(),
      }));

      const maxCmdLength = Math.max(...commands.map((cmd) => cmd.name.length)) + 2;

      commands.forEach((cmd) => {
        console.log(
          `${chalk.bold(cmd.name.padEnd(maxCmdLength))} ${cmd.description}\n`
        );
      });

      console.log('\n\nUse "greycodejs <command> --help" for detailed information about a specific command.\n');
    });
};