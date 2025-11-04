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
    // Example:
    // name: {
    //   type: DataTypes.STRING,
    //   allowNull: false
    // },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Define associations here
  ${modelName}.associate = (models) => {
    // Example:
    // ${modelName}.hasMany(models.OtherModel);
    // ${modelName}.belongsTo(models.AnotherModel);
  };

  return ${modelName};
};`;
          break;

        case 'mongoose':
          content = `const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ${modelName} Schema
 */
const ${modelName}Schema = new Schema({
  // Add your fields here
  // Example:
  // name: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },
  // email: {
  //   type: String,
  //   required: true,
  //   unique: true,
  //   lowercase: true
  // },
  // age: {
  //   type: Number,
  //   min: 0
  // }
}, { 
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// Define indexes
// ${modelName}Schema.index({ email: 1 });

// Define instance methods
${modelName}Schema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Define static methods
${modelName}Schema.statics.findByName = function(name) {
  return this.findOne({ name });
};

// Export model
module.exports = mongoose.model('${modelName}', ${modelName}Schema);`;
          break;

        case 'prisma':
          console.log(chalk.yellow('For Prisma, add your model to prisma/schema.prisma:'));
          console.log(chalk.gray(`
model ${modelName} {
  id        String   @id @default(uuid())
  // Add your fields here
  // Example:
  // name      String
  // email     String   @unique
  // age       Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Define relations
  // Example:
  // posts     Post[]
  // profile   Profile?
}`));
          console.log(chalk.blue('\nAfter editing schema.prisma, run:'));
          console.log(chalk.gray('  npx prisma generate'));
          console.log(chalk.gray('  npx prisma migrate dev --name add_' + modelName.toLowerCase()));
          return; // Prisma models are defined in schema.prisma

        default:
          console.error(chalk.red(`Unsupported ORM: ${activeORM}`));
          process.exit(1);
      }

      // Check if file already exists
      if (fs.existsSync(targetPath)) {
        console.error(chalk.red(`Model "${modelName}" already exists at ${targetPath}`));
        process.exit(1);
      }

      // Write the file
      fs.writeFileSync(targetPath, content);
      console.log(chalk.green(`\n✅ ${activeORM} model "${modelName}" created successfully!`));
      console.log(chalk.gray(`   Location: ${targetPath}`));
      
      // ORM-specific next steps
      console.log(chalk.blue('\n📝 Next steps:'));
      switch (activeORM) {
        case 'sequelize':
          console.log(chalk.gray('   1. Edit the model file to add your fields'));
          console.log(chalk.gray('   2. Run: npm run cli -- migrate'));
          console.log(chalk.gray('   3. Create controller: npm run cli -- create-controller ' + modelName));
          break;
        case 'mongoose':
          console.log(chalk.gray('   1. Edit the model file to add your fields'));
          console.log(chalk.gray('   2. No migration needed (Mongoose is schema-less)'));
          console.log(chalk.gray('   3. Create controller: npm run cli -- create-controller ' + modelName));
          break;
      }
    });
};