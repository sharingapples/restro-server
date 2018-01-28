const User = require('../../db/User');

module.exports = function createRoute({ db, server }) {
  server.post('/register', (req, res) => {
    const {
      name, username, password, role,
    } = req.body;
    // Make sure the username is unique
    if (db.get('users').find({ username }).value()) {
      res.status(500);
      return res.send('User already exists');
    }

    db.get('users').push(User.create(username, name, role, password)).write();
    return res.send('OK');
  });
};
