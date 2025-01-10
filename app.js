const express = require('express');
const path = require('path');
const applyMiddleware = require('./core/middleware');
const Router = require('./core/router');
const sequelize = require('./core/database');
const asset = require('./core/assetHelper');
const { port } = require('./config/app');
const loadRoutes = require('./core/routeLoader'); // Ensure the path is correct

const app = express();

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Serve static files (e.g., CSS)
app.use(express.static(path.join(__dirname, 'public')));


applyMiddleware(app);

// Load dynamic routes
const routesDir = path.resolve(__dirname, './routes');
loadRoutes(app, routesDir);

const router = new Router();
router.get('/', (req, res) => {
  // Render the home page
  res.render('home', {
    title: 'Grey.js - The Express.js Framework',
    devs: [
      { name: 'Kudzai Munyama', role: 'Lead Developer' },
    ],
  });
});
app.use(router.use());

app.listen(port, () => console.log(`Server running on port ${port}\nclick --> http://localhost:${port}\n`));
