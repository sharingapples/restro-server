module.exports = function createServerApi(db) {
  return {
    insertItem: async item => db.Items.insert(item),

    insertMenuItem: async menuItem => db.MenuItems.insert(menuItem),
  };
};
