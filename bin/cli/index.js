#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');

const program = new Command();

program
  .name('greycodejs')
  .description('Greycodejs CLI')
  .version('0.0.1');

// Load all command modules
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = [
  'create-model',
  'migrate',
  'migrate-status',
  'migrate-undo',
  'migrate-undo-all',
  'create-controller',
  'create-route',
  'make-seed',
  'run',
  'create-resource',
  'setup-db',
  'setup-prisma',
  'make-service',
  'list-commands'
];

commandFiles.forEach(commandFile => {
  try {
    const commandModule = require(path.join(commandsPath, commandFile));
    if (typeof commandModule === 'function') {
      commandModule(program);
    }
  } catch (error) {
    console.error(chalk.red(`Failed to load command ${commandFile}:`), error.message);
  }
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}