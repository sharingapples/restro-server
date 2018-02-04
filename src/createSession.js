const ServerApi = require('./ServerApi');
const db = require('./db');

function flatten(list) {
  return list.reduce((l, r) => l.concat(r), []);
}

const sessions = {
  waiter: [],
  cashiers: [],
  admins: [],
  dispatch(list, action) {
    flatten(list).forEach(session => session.dispatch(action));
  },
};

module.exports = function createSessionFactory(app) {
  return function createSession(url) {
    const token = url.substr(1);
    // const user = app.cache.get(token);
    const user = app.db.get('users').find({ username: 'super' }).value();
    console.log('Creating session for', user);
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
    };
    return session;
  };
};
