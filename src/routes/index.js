// Load all the routes dynamically based on the modules
// available on the folder
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.resolve(__dirname));
const routes = files
  .filter(f => fs.lstatSync(path.resolve(__dirname, f)).isDirectory())
  .map(f => require(`./${f}`)); // eslint-disable-line global-require, import/no-dynamic-require
module.exports = function configureRoutes(app) {
  routes.forEach(createRoute => createRoute(app));
};
