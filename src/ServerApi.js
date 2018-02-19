module.exports = function createServerApi(db, session) {
  return {
    placeOrder: async (tableId, orderItems, discount = 0, remark = '') => {
      const order = await db.Orders.insert({
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
          orderId: order.id,
          menuItemId,
          qty: orderItem.qty,
          rate: orderItem.rate,
        });
      }));

      return order.id;
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

    insertTable: async table => db.Tables.insert(table),
    insertItem: async item => db.Items.insert(item),

    deleteItem: async id => db.Items.delete(id),

    purchaseItem: data => db.Purchases.insert(Object.assign({}, data, {
      timestamp: Date.now(),
      userId: session.user.id,
    })),

    updateItem: async (item, id) => db.Items.update(item, id),

    insertMenuItem: async menuItem => db.MenuItems.insert(menuItem),
  };
};
