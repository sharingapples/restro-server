const run = require('app-node');
const express = require('express');

run((app) => {
  app.configure({
    server: express(),
  });

  // Add join data format for posting
  app.server.use(express.json());

  // Listen to the server port
  app.server.listen(process.env.PORT || 8080);
});
