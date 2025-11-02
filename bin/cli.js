#!/usr/bin/env node

/**
 * GreyCodeJS CLI
 * Main entry point for all CLI commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('greycodejs')
  .description('GreyCodeJS CLI - Build Express.js applications faster')
  .version('0.0.2');

// Load all command modules from commands directory
const commandsPath = path.join(__dirname, 'cli', 'commands');

// Check if commands directory exists
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  commandFiles.forEach(file => {
    try {
      const commandModule = require(path.join(commandsPath, file));
      if (typeof commandModule === 'function') {
        commandModule(program);
      } else {
        console.warn(chalk.yellow(`Warning: ${file} does not export a function`));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to load command ${file}:`), error.message);
    }
  });
} else {
  console.error(chalk.red(`Commands directory not found at ${commandsPath}`));
}

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}