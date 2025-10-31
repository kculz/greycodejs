const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('setup-db')
    .description('Configure database settings for the active ORM')
    .action(async () => {
      const inquirer = (await import('inquirer')).default;
      const configDir = path.resolve(process.cwd(), 'config');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      try {
        let activeORM;
        try {
          const ormConfig = require(path.join(configDir, 'orm.js'));
          activeORM = ormConfig.activeORM;
        } catch {
          activeORM = null;
        }

        if (!activeORM) {
          const { selectedORM } = await inquirer.prompt({
            type: 'list',
            name: 'selectedORM',
            message: 'Select your ORM:',
            choices: ['sequelize', 'mongoose', 'prisma'],
            default: 'sequelize'
          });
          activeORM = selectedORM;
          
          fs.writeFileSync(
            path.join(configDir, 'orm.js'),
            `module.exports = {\n  activeORM: '${activeORM}'\n};`
          );
        }

        const dbConfigPath = path.join(configDir, 'database.js');
        let dbConfigContent;

        if (activeORM === 'sequelize') {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'dialect',
              message: 'Database type:',
              choices: ['postgres', 'mysql', 'sqlite', 'mssql'],
              default: 'postgres'
            },
            {
              type: 'input',
              name: 'host',
              message: 'Database host:',
              default: 'localhost',
              when: (answers) => answers.dialect !== 'sqlite'
            },
            {
              type: 'input',
              name: 'port',
              message: 'Database port:',
              default: (answers) => {
                switch(answers.dialect) {
                  case 'postgres': return '5432';
                  case 'mysql': return '3306';
                  case 'mssql': return '1433';
                  default: return '';
                }
              },
              when: (answers) => answers.dialect !== 'sqlite'
            },
            {
              type: 'input',
              name: 'database',
              message: 'Database name:',
              default: 'greycode_db',
              when: (answers) => answers.dialect !== 'sqlite'
            },
            {
              type: 'input',
              name: 'username',
              message: 'Database username:',
              default: 'postgres',
              when: (answers) => answers.dialect !== 'sqlite'
            },
            {
              type: 'password',
              name: 'password',
              message: 'Database password:',
              mask: '*',
              when: (answers) => answers.dialect !== 'sqlite'
            },
            {
              type: 'input',
              name: 'storage',
              message: 'SQLite storage path:',
              default: 'database.sqlite',
              when: (answers) => answers.dialect === 'sqlite'
            }
          ]);

          dbConfigContent = `module.exports = ${JSON.stringify(answers, null, 2)};`;
        }
        else if (activeORM === 'mongoose') {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'uri',
              message: 'MongoDB connection URI:',
              default: 'mongodb://localhost:27017/greycode_db'
            }
          ]);

          dbConfigContent = `module.exports = '${answers.uri}';`;
        }
        else if (activeORM === 'prisma') {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'provider',
              message: 'Database provider:',
              choices: ['postgresql', 'mysql', 'sqlite', 'sqlserver', 'mongodb'],
              default: 'postgresql'
            },
            {
              type: 'input',
              name: 'url',
              message: 'Database connection URL:',
              default: (answers) => {
                switch(answers.provider) {
                  case 'postgresql': return 'postgresql://user:password@localhost:5432/greycode_db';
                  case 'mysql': return 'mysql://user:password@localhost:3306/greycode_db';
                  case 'sqlite': return 'file:./dev.db';
                  case 'sqlserver': return 'sqlserver://localhost:1433;database=greycode_db;user=sa;password=password';
                  case 'mongodb': return 'mongodb://user:password@localhost:27017/greycode_db';
                  default: return '';
                }
              }
            }
          ]);

          dbConfigContent = `module.exports = {
  provider: '${answers.provider}',
  url: '${answers.url}'
};`;
        }

        fs.writeFileSync(dbConfigPath, dbConfigContent);
        console.log(chalk.green(`\nDatabase configuration for ${activeORM} created at:`), dbConfigPath);
        console.log(chalk.yellow('\nMake sure to add this to your .gitignore:'));
        console.log(chalk.gray('config/database.js'));

        if (activeORM === 'prisma') {
          console.log(chalk.blue('\nFor Prisma, you also need to:'));
          console.log('1. Create a prisma/schema.prisma file with your models');
          console.log('2. Run "npx prisma generate"');
          console.log('3. Run "npx prisma migrate dev"');
        }

      } catch (error) {
        console.error(chalk.red('Error setting up database:'), error.message);
      }
    });
};