module.exports = function createRoute({ server }) {
  server.post('/login', (req, res) => {
    const { username, password } = req.body;
    // TODO: Validate the username/password

    res.send(`OK - ${username}`);
  });
}
