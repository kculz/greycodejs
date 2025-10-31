const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('migrate:undo <model>')
    .description('Undo the migration for the specified model by dropping its table')
    .action(async (model) => {
      const configPath = path.resolve(process.cwd(), 'config/database.js');
      const modelsPath = path.resolve(process.cwd(), 'models');
      const sequelize = new Sequelize(require(configPath));

      try {
        console.log(chalk.blue(`Reverting migration for the model: ${model}`));

        const modelFile = path.join(modelsPath, `${model}.js`);
        if (!fs.existsSync(modelFile)) {
          console.error(chalk.red(`Model "${model}" does not exist in the models directory.`));
          process.exit(1);
        }

        const modelDefinition = require(modelFile);
        const modelInstance = modelDefinition(sequelize, Sequelize.DataTypes);

        await sequelize.getQueryInterface().dropTable(modelInstance.tableName);
        console.log(chalk.green(`Successfully dropped the table for model "${model}"!`));
      } catch (error) {
        console.error(chalk.red(`Error undoing migration for model "${model}":`, error.message));
      } finally {
        await sequelize.close();
      }
    });
};