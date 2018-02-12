module.exports = function createRoute({ cache, server }) {
  server.post('/validate/:sessionId', async (req, res) => {
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
