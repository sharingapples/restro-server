const ServerApi = require('./ServerApi');
const db = require('./db');

function flatten(list) {
  return list.reduce((l, r) => l.concat(r), []);
}

const sessions = {
  waiters: [],
  cashiers: [],
  admins: [],

  dispatch(list, action) {
    flatten(list).forEach(session => session.dispatch(action));
  },
};

module.exports = function createSessionFactory(app) {
  return function createSession(url) {
    const token = url.substr(1);

    const user = app.cache.get(token);

    if (!user) {
      return null;
    }

    const session = {
      user,

      onStart: () => {
        // keep track of the session
        sessions[user.role].push(session);

        session.emit('user', user);

        return new ServerApi(db, session, sessions);
      },

      onClose: () => {
        const idx = sessions[user.role].findIndex(session);
        if (idx >= 0) {
          sessions[user.role].splice(idx, 1);
        }
      },
    };

    return session;
  };
};
