const run = require('app-node');
const express = require('express');

const createDatabase = require('./db');
const configureRoutes = require('./routes');

run(async (app) => {
  app.configure({
    server: express(),
    db: await createDatabase(),
  });

  // Add join data format for posting
  app.server.use(express.json());

  // Configure all the routes
  configureRoutes(app);

  // Listen to the server port
  app.server.listen(process.env.PORT || 8080);
  app.logger.info('Server started at port', 8080);
});
