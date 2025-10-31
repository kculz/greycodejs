const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('create-model <name>')
    .description('Generate a new model for the active ORM')
    .action((name) => {
      const { activeORM } = require('../../../config/orm');
      const modelName = name.charAt(0).toUpperCase() + name.slice(1);
      const modelsPath = path.resolve(process.cwd(), 'models');
      
      if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
      }

      let content;
      const targetPath = path.join(modelsPath, `${modelName}.js`);

      switch (activeORM) {
        case 'sequelize':
          content = `module.exports = (sequelize, DataTypes) => {
  const ${modelName} = sequelize.define('${modelName}', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Add your fields here
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  });

  ${modelName}.associate = (models) => {
    // Define associations here
  };

  return ${modelName};
};`;
          break;

        case 'mongoose':
          content = `const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ${modelName}Schema = new Schema({
  // Add your fields here
}, { timestamps: true });

module.exports = mongoose.model('${modelName}', ${modelName}Schema);`;
          break;

        case 'prisma':
          console.log(chalk.yellow('For Prisma, add your model to prisma/schema.prisma:'));
          console.log(chalk.gray(`
model ${modelName} {
  id        String   @id @default(uuid())
  // Add your fields here
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`));
          return;

        default:
          console.error(chalk.red(`Unsupported ORM: ${activeORM}`));
          return;
      }

      fs.writeFileSync(targetPath, content);
      console.log(chalk.green(`${activeORM} model ${modelName} created at ${targetPath}`));
    });
};