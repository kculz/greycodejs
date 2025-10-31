const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('create-route <name>')
    .description('Generate a new route file for a specified controller')
    .action((name) => {
      const routeName = name.charAt(0).toUpperCase() + name.slice(1);
      const lowerRouteName = name.toLowerCase();

      const content = `
const router = require('express').Router();
const { ${routeName}Controller } = require('../controllers/${routeName}Controller');

// Define routes for ${routeName}
router.get('/', ${routeName}Controller.getAll);
router.get('/:id', ${routeName}Controller.getById);
router.post('/', ${routeName}Controller.create);
router.put('/:id', ${routeName}Controller.update);
router.delete('/:id', ${routeName}Controller.remove);

module.exports = { router };
`;

      const routesPath = path.resolve(process.cwd(), 'routes');
      const targetPath = path.join(routesPath, `${lowerRouteName}.js`);

      if (!fs.existsSync(routesPath)) {
        fs.mkdirSync(routesPath, { recursive: true });
      }

      const controllersPath = path.resolve(process.cwd(), 'controllers');
      const controllerPath = path.join(controllersPath, `${routeName}Controller.js`);
      if (!fs.existsSync(controllerPath)) {
        console.error(chalk.red(`Controller ${routeName}Controller.js does not exist. Create the controller first.`));
        return;
      }

      if (fs.existsSync(targetPath)) {
        console.error(chalk.red(`Route ${lowerRouteName}.js already exists.`));
      } else {
        fs.writeFileSync(targetPath, content);
        console.log(chalk.green(`Route ${lowerRouteName}.js created at ${targetPath}`));
      }
    });
};