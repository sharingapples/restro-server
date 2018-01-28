const shortId = require('shortid');
const models = require('../../models');

module.exports = function createRoute({ server, db }) {
  server.get('/r/:model', (req, res) => {
    const { model } = req.params;
    if (models[model]) {
      res.send(db.get(model).value());
    } else {
      res.status(404);
      res.send('Not found');
    }
  });

  server.get('/r/:model/:id', (req, res) => {
    const { model, id } = req.params;
    if (models[model]) {
      res.send(db.get(model).find({ id }).value());
    } else {
      res.status(404);
      res.send('Not found');
    }
  });

  server.post('/r/:model', (req, res) => {
    const { model } = req.params;
    if (models[model]) {
      const id = shortId();
      const record = Object.assign({}, req.body, { id });
      db.get(model).push(record).write();
      res.send(record);
    } else {
      res.status(404);
      res.send('Not found');
    }
  });

  server.put('/r/:model/:id', (req, res) => {
    const { id, model } = req.params;
    if (models[model]) {
      db.get(model).find({ id }).assign(req.body).write();
      res.send('ok');
    } else {
      res.status(404);
      res.send('Not Found');
    }
  });
};
