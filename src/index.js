const run = require('app-node');
const express = require('express');
const http = require('http');
const LRU = require('lru-cache');
const createDatabase = require('./db');
const configureRoutes = require('./routes');
const createSession = require('./routes/socket/createSession');
const socket = require('socket.red');

run(async (app) => {
  const cache = LRU({ max: 500 });

  app.configure({
    server: express(),
    cache,
    db: await createDatabase(),
  });

  // Add a session for test case
  if (process.env.NODE_ENV === 'development') {
    const user = await app.db.Users.findOne({ username: 'admin' });
    app.cache.set('1', user);
  }

  // Add join data format for posting
  app.server.use(express.json());
  const httpServer = http.createServer(app.server);

  app.configure({
    socket: socket(httpServer, createSession(app)),
  });

  // Configure all the routes
  configureRoutes(app);

  // Listen to the server port
  httpServer.listen(process.env.PORT || 8080);
  app.logger.info('Server started at port', 8080);

  app.addExitHandler(() => {
    httpServer.close();

    // Close database connection
    app.db.close();
  });
});
