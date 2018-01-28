const run = require('app-node');
const express = require('express');

const configureRoutes = require('./routes');

run((app) => {
  app.configure({
    server: express(),
  });

  // Add join data format for posting
  app.server.use(express.json());

  // Configure all the routes
  configureRoutes(app);

  // Listen to the server port
  app.server.listen(process.env.PORT || 8080);
});
