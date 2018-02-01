const uuid = require('uuid/v4');

module.exports = function createRoute({ cache, server, db }) {
  server.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.get('users').find({ username }).value();
    if (!user || !db.User.verify(user, password)) {
      res.status(401);
      return res.send('Unauthorized');
    }

    const token = uuid();
    cache.set(token, user);

    return res.send(JSON.stringify({
      role: user.role,
      name: user.name,
      token,
    }));
  });
};
