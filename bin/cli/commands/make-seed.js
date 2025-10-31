const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { faker } = require('@faker-js/faker');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('make-seed <model>')
    .option('--seed', 'Seed the database with data from the generated JSON')
    .option('--count <number>', 'Number of records to generate', 10)
    .description('Generate a JSON file for seeding or seed data into the database')
    .action(async (modelName, options) => {
      const { seed, count } = options;
      const seedCount = parseInt(count, 10);

      const modelsPath = path.resolve(process.cwd(), 'models');
      const seedDataPath = path.resolve(process.cwd(), 'seeds');
      const modelFile = path.join(modelsPath, `${modelName}.js`);

      if (!fs.existsSync(modelFile)) {
        console.error(chalk.red(`Model "${modelName}" not found in the models directory.`));
        return;
      }

      const sequelize = new Sequelize(require(path.resolve(process.cwd(), 'config/database.js')));
      const model = require(modelFile)(sequelize, Sequelize.DataTypes);

      if (!fs.existsSync(seedDataPath)) {
        fs.mkdirSync(seedDataPath, { recursive: true });
      }

      const jsonFilePath = path.join(seedDataPath, `${modelName.toLowerCase()}-seed.json`);

      if (!seed) {
        const seedData = [];
        for (let i = 0; i < seedCount; i++) {
          const record = {};
          for (const field in model.rawAttributes) {
            if (field === 'id') continue;
            const type = model.rawAttributes[field].type.key;

            switch (type) {
              case 'STRING':
                record[field] = faker.lorem.words(3);
                break;
              case 'TEXT':
                record[field] = faker.lorem.paragraph();
                break;
              case 'INTEGER':
                record[field] = faker.datatype.number();
                break;
              case 'BOOLEAN':
                record[field] = faker.datatype.boolean();
                break;
              case 'DATE':
                record[field] = faker.date.past();
                break;
              case 'UUID':
                record[field] = faker.datatype.uuid();
                break;
              default:
                record[field] = null;
            }
          }
          seedData.push(record);
        }

        fs.writeFileSync(jsonFilePath, JSON.stringify(seedData, null, 2));
        console.log(chalk.green(`Seed data for model "${modelName}" created at ${jsonFilePath}`));
      } else {
        if (!fs.existsSync(jsonFilePath)) {
          console.error(chalk.red(`Seed data JSON file for model "${modelName}" not found.`));
          return;
        }

        const seedData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

        try {
          console.log(chalk.blue(`Seeding ${seedData.length} records into the "${modelName}" table...`));
          await model.bulkCreate(seedData);
          console.log(chalk.green(`Successfully seeded ${seedData.length} records into the "${modelName}" table.`));
        } catch (error) {
          console.error(chalk.red(`Error seeding data into the "${modelName}" table:`, error.message));
        } finally {
          await sequelize.close();
        }
      }
    });
};