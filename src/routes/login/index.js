const uuid = require('uuid/v4');

module.exports = function createRoute({ cache, server, db }) {
  server.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.Users.verify(username, password);
    if (!user) {
      res.status(401);
      return res.send('Unauthorized');
    }

    const token = uuid();
    cache.set(token, user);

    return res.send(JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      token,
    }));
  });
};
