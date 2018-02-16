module.exports = function createServerApi(db, session) {
  return {
    placeOrder: async (tableId, orderItems, discount = 0, remark = '') => {
      const orderId = await db.Orders.insert({
        tableId,
        userId: session.user.id,
        timestamp: Date.now(),
        status: 'Pending',
        discount,
        remark,
      });

      await Promise.all(orderItems.map(async (orderItem) => {
        let { menuItemId } = orderItem;
        if (!await db.MenuItems.get(menuItemId)) {
          const menuItem = await db.MenuItems.insert({
            name: orderItem.menuItemId,
            price: orderItem.rate,
          });
          menuItemId = menuItem.id;
        }

        await db.OrderItems.insert({
          orderId,
          menuItemId,
          qty: orderItem.qty,
          rate: orderItem.rate,
        });
      }));

      return orderId;
    },

    updateOrder: async (orderId, tableId, orderItems, discount = 0, remark = '') => {
      await db.OrderItems.deleteFilter('orderId=?', orderId);
      await Promise.all(orderItems.map(orderItem => db.OrderItems.insert({
        orderId,
        menuItemId: orderItem.menuItemId,
        qty: orderItem.qty,
        rate: orderItem.rate,
      })));

      await db.Orders.update({
        tableId,
        discount,
        remark,
      }, orderId);

      return true;
    },

    reconcile: async (itemStocks) => {
      console.log(itemStocks);
      // itemStocks is a list of object with { itemId: id, stock: num }
      itemStocks.forEach((itemStock) => {
        db.ItemStocks.insert({
          itemId: itemStock.itemId,
          stock: itemStock.stock,
          userId: session.user.id,
          timestamp: Date.now(),
        });
      });

      return true;
    },

    insertTable: async ({ name }) => db.Tables.insert({ name, top: 0, left: 0, angle: 0 }),
    updateTable: async (obj, id) => db.Tables.update(obj, id),
    deleteTable: async id => db.Tables.delete(id),

    insertItem: async item => db.Items.insert(item),

    deleteItem: async id => db.Items.delete(id),

    purchaseItem: data => db.Purchases.insert(Object.assign({}, data, {
      timestamp: Date.now(),
      userId: session.user.id,
    })),

    updateItem: async (item, id) => db.Items.update(item, id),

    insertMenuItem: async menuItem => db.MenuItems.insert(menuItem),
    deleteMenuItem: async id => db.MenuItems.delete(id),
  };
};
