module.exports = function createRoute({ server, db }) {
  server.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.get('users').find({ username }).value();
    if (!user || !db.User.verify(user, password)) {
      res.status(401);
      return res.send('Unauthorized');
    }

    // TODO: Validate the username/password

    // Create a session


    return res.send(`OK - ${user.name}`);
  });
};
