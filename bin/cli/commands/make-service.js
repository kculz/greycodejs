const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('make-service <name>')
    .description('Create a new service layer file')
    .action((name) => {
      const serviceName = `${name.charAt(0).toUpperCase() + name.slice(1)}Service`;
      const serviceContent = `const { ${serviceName.replace('Service', '')} } = require('../models');

class ${serviceName} {
  static async getAll() {
    return await ${serviceName.replace('Service', '')}.findAll();
  }

  // Add other service methods here
}

module.exports = ${serviceName};`;
      
      const servicesPath = path.resolve(process.cwd(), 'services');
      const filePath = path.join(servicesPath, `${serviceName}.js`);
      
      if (!fs.existsSync(servicesPath)) {
        fs.mkdirSync(servicesPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, serviceContent);
      console.log(chalk.green(`Service created at ${filePath}`));
    });
};