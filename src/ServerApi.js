module.exports = function createServerApi(db, session) {
  return {
    extractSales: async (itemTypeId, start, end) => {
      // First get all menu items for the given item type
      const items = await db.all('SELECT MenuItem.id as id, MenuItem.qty as qty, MenuItem.name as name, Item.unit as unit FROM MenuItem INNER JOIN Item ON Item.id=MenuItem.itemId WHERE Item.itemTypeId=? ORDER BY Item.id, MenuItem.name', itemTypeId);

      const res = items.reduce((r, item, idx) => Object.assign(r, {
        [item.id]: {
          sn: idx + 1,
          id: item.id,
          item: item.name,
          qty: item.qty,
          unit: item.unit,
          units: 0,
          amount: 0,
        },
      }), {});

      const sql = `
        SELECT MenuItem.id, OrderItem.qty as units, OrderItem.rate FROM [Order]
          INNER JOIN OrderItem on OrderItem.orderId = [Order].id
          INNER JOIN MenuItem on MenuItem.id = OrderItem.menuItemId
          INNER JOIN Item on Item.id = MenuItem.itemId
          WHERE Item.itemTypeId=? AND [Order].status = 'Completed' AND [Order].timestamp >= ? AND [Order].timestamp < ?
      `;
      const startTimestamp = Date.parse(start);
      const endTimestamp = Date.parse(end) + 86400000;

      // Extract all the records
      const orderItems = await db.all(sql, itemTypeId, startTimestamp, endTimestamp);
      orderItems.forEach((orderItem) => {
        const resItem = res[orderItem.id];
        resItem.units += orderItem.units;
        resItem.amount += (orderItem.units * orderItem.rate);
      });

      // Return an array from the map
      return Object.keys(res).map(k => res[k]).sort((a, b) => a.sn - b.sn);
    },

    placeOrder: async (tableId, orderItems, discount = 0, serviceCharge = false, vat = false, remark = '') => {
      const order = await db.Orders.insert({
        tableId,
        userId: session.user.id,
        timestamp: Date.now(),
        status: 'Pending',
        discount,
        serviceCharge,
        vat,
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
          menuItemId: parseInt(menuItemId, 10),
          qty: parseFloat(orderItem.qty),
          rate: parseFloat(orderItem.rate),
        });
      }));

      return order.id;
    },

    updateOrder: async (orderId, tableId, orderItems, discount = 0, serviceCharge = false, vat = false, remark = '') => {
      await db.OrderItems.deleteFilter('orderId=?', orderId);
      await Promise.all(orderItems.map(orderItem => db.OrderItems.insert({
        orderId,
        menuItemId: parseInt(orderItem.menuItemId, 10),
        qty: parseFloat(orderItem.qty),
        rate: parseFloat(orderItem.rate),
      })));

      await db.Orders.update({
        tableId,
        discount,
        serviceCharge,
        vat,
        remark,
      }, orderId);

      return true;
    },

    cancelOrder: async (orderId) => {
      await db.Orders.update({
        status: 'Cancelled',
        timestamp: Date.now(),
        userId: session.user.id,
      }, orderId);
      return true;
    },

    printOrder: async (orderId) => {
      await db.Orders.update({
        status: 'Completed',
        timestamp: Date.now(),
        userId: session.user.id,
      }, orderId);
      return true;
    },

    completeOrder: async (orderId) => {
      await db.Orders.update({
        status: 'Completed',
        timestamp: Date.now(),
        userId: session.user.id,
      }, orderId);
      return true;
    },

    reconcile: async (itemStocks) => {
      // itemStocks is a list of object with { itemId: id, stock: num }
      await Promise.all(itemStocks.map(itemStock => (
        db.ItemStocks.insert({
          itemId: itemStock.itemId,
          stock: itemStock.stock,
          userId: session.user.id,
          timestamp: Date.now(),
        })
      )));

      return true;
    },

    insertTable: async ({ name }) => db.Tables.insert({
      name, top: 0, left: 0, angle: 0,
    }),
    updateTable: async (obj, id) => db.Tables.update(obj, id),
    deleteTable: async id => db.Tables.delete(id),

    insertItem: async item => db.Items.insert(item),

    deleteItem: async id => db.Items.delete(id),

    purchaseItem: data => db.Purchases.insert(Object.assign({}, data, {
      timestamp: Date.now(),
      userId: session.user.id,
    })),

    updateItem: async (item, id) => db.Items.update({
      name: item.name,
      unit: item.unit,
      itemTypeId: item.itemTypeId,
      threshold: item.threshold,
    }, id),

    insertMenuItem: async menuItem => db.MenuItems.insert(menuItem),
    deleteMenuItem: async id => db.MenuItems.delete(id),
    updateMenuItem: async (menuItem, id) => db.MenuItems.update(menuItem, id),

    insertUser: async user => db.Users.insert(user),
  };
};
