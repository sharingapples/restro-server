module.exports = function createRoute({ cache, server }) {
  server.get('/socket/:sessionId', (req, res) => {
    // Add cross origin policy - required for development mode only
    res.header('Access-Control-Allow-Origin', '*');
    const { sessionId } = req.params;
    const user = cache.get(sessionId);
    if (user) {
      return res.send(JSON.stringify({
        id: user.id,
        role: user.role,
        name: user.name,
        username: user.username,
        token: sessionId,
      }));
    }

    res.status(401);
    return res.send('Session expired');
  });
};
