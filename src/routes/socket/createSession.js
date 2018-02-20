const createServerApi = require('../../ServerApi');

function flatten(list) {
  return list.reduce((l, r) => l.concat(r), []);
}

const sessions = {
  Waiter: [],
  Cashier: [],
  Admin: [],
  dispatch(list, action) {
    flatten(list).forEach(session => session.dispatch(action));
  },
};

module.exports = function createSessionFactory(app) {
  return function createSession(url) {
    const [, prefix, token] = url.split('/');
    if (prefix !== 'socket') {
      return null;
    }

    const user = app.cache.get(token);

    if (!user) {
      return null;
    }

    const unsubscribers = [];

    const session = {
      user,

      populate: async (dataStructure) => {
        session.dispatch({
          type: 'SCHEMA.POPULATE',
          schema: dataStructure.name,
          payload: await dataStructure.all(),
        });
      },

      setupListeners: (...dataStructures) => {
        dataStructures.forEach((ds) => {
          unsubscribers.push(ds.addListener('insert', (record) => {
            session.dispatch({
              type: 'SCHEMA.INSERT',
              schema: ds.name,
              payload: record,
            });
          }));

          unsubscribers.push(ds.addListener('delete', (record) => {
            session.dispatch({
              type: 'SCHEMA.DELETE',
              schema: ds.name,
              payload: record,
            });
          }));

          unsubscribers.push(ds.addListener('update', (record) => {
            session.dispatch({
              type: 'SCHEMA.UPDATE',
              schema: ds.name,
              payload: record,
            });
          }));
        });
      },

      onStart: () => {
        // Keep track of the session
        sessions[user.role].push(session);
        session.addCloseListener(() => {
          unsubscribers.forEach(u => u());
          const idx = sessions[user.role].findIndex(s => s === session);
          sessions[user.role].splice(idx, 1);
        });

        const {
          ItemTypes, Tables, Items, MenuItems, Orders,
        } = app.db;

        // Send all the items, menuItems and active orders
        session.populate(ItemTypes);
        session.populate(Tables);
        session.populate(Items);
        session.populate(MenuItems);
        session.populate(Orders);

        // Add standard handlers to inform all the sessions whenever something changes
        session.setupListeners(Tables, Items, MenuItems, Orders);

        // Return the server api available for the session to be invoked by remote client
        return createServerApi(app.db, session, sessions);
      },
    };
    return session;
  };
};
