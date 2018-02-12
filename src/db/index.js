const sqlite = require('sqlite');
const CachedDataStructure = require('./CachedDataStructure');
const DataStructure = require('./DataStructure');
const User = require('./User');

module.exports = async function createDatabase() {
  const db = await sqlite.open('./restro.sqlite.db', { Promise });
  await db.migrate({
    migrationsPath: './src/db/migrations',
  });

  // Load all the ItemTypes, Items, MenuItems and active Orders

  db.Users = new User(db);
  db.ItemTypes = new CachedDataStructure(db, 'ItemType');
  db.Items = new CachedDataStructure(db, 'Item');
  db.MenuItems = new CachedDataStructure(db, 'MenuItem');
  db.Tables = new CachedDataStructure(db, 'Table');
  db.Orders = new CachedDataStructure(db, 'Order');

  db.ItemStocks = new DataStructure(db, 'ItemStock');
  db.OrderItems = new DataStructure(db, 'OrderItem');
  db.Purchases = new DataStructure(db, 'Purchase');

  // Load all the records
  await db.ItemTypes.init();
  await db.MenuItems.init();
  await db.Tables.init();

  // Initialize the items cache, getting stock value from the ItemStocks table
  await db.Items.init(async () => {
    const items = await db.all('SELECT * FROM [Item]');
    await Promise.all(items.map(async (item, idx) => {
      const itemStock = await db.get('SELECT * FROM [ItemStock] WHERE itemId=? ORDER BY timestamp DESC LIMIT 1', item.id);
      const timestamp = itemStock ? itemStock.timestamp : 0;
      const stock = itemStock ? itemStock.stock : 0;

      // Sum up all the purchases and orders that happened after this stock update
      const purchases = await db.get('SELECT SUM(qty) AS qty FROM Purchase WHERE itemId=? AND timestamp > ?', item.id, timestamp);
      const sales = await db.get('SELECT SUM(OrderItem.qty * MenuItem.qty) as qty FROM OrderItem INNER JOIN MenuItem ON MenuItem.id = OrderItem.menuItemId AND MenuItem.itemId=? INNER JOIN [Order] ON [Order].id = OrderItem.orderId AND [Order].timestamp > ?', item.id, timestamp);

      items[idx].stockTimestamp = timestamp;
      items[idx].stock = (stock + purchases.qty) - sales.qty;
    }));

    // Whenever an itemStock is added update the stock values
    db.ItemStocks.addListener('insert', (record) => {
      const item = db.Items.get(record.itemId);
      const prevStock = item.stock;
      item.stock = record.stock;
      db.Items.fireListeners('update', { id: item.id, stock: record.stock }, { id: item.id, stock: prevStock });
    });

    // For every purchase increase the stock value
    db.Purchases.addListener('insert', (record) => {
      const item = db.Items.get(record.itemId);
      const prevStock = item.stock;
      item.stock += record.qty;
      db.Items.fireListeners('update', { id: item.id, stock: record.stock }, { id: item.id, stock: prevStock });
    });
    db.OrderItems.addListener('insert', (record) => {
      const menuItem = db.Items.get(record.menuItemId);
      if (menuItem.itemId) {
        const item = db.Items.get(menuItem.itemId);
        const prevStock = item.stock;
        item.stock -= record.qty * item.qty;
        db.Items.fireListeners('update', { id: item.id, stock: record.stock }, { id: item.id, stock: prevStock });
      }
    });
    db.Purchases.addListener('update', (update, original) => {
      // Only if the qty was updated
      if (update.qty !== original.qty || update.itemId !== original.itemId) {
        const originalItem = db.Items.get(original.itemId);
        const originalStock = originalItem.stock;

        originalItem.stock -= original.qty;
        const updateItem = db.Items.get(update.itemId);
        const updateStock = updateItem.stock;
        updateItem.stock += update.qty;
        db.Items.fireListeners('update', { id: originalItem.id, stock: originalItem.stock }, { id: originalItem.id, stock: originalStock });
        if (update.itemId !== original.itemId) {
          db.Items.fireListeners('update', { id: updateItem.id, stock: updateItem.stock }, { id: updateItem.id, stock: updateStock });
        }
      }
    });
    db.OrderItems.addListener('update', (update, original) => {
      const originalMenuItem = db.Items.get(original.menuItemId);
      const updateMenuItem = db.Items.get(update.menuItemId);
      // Only if the qty is changed or the menu item was changed of the order
      if (update.qty !== original.qty || originalMenuItem !== updateMenuItem) {
        // Need to keep it before check since item can be null for menu item
        let originalStock = null;
        let updateStock = null;
        let originalItem = null;
        let updateItem = null;

        // Update original item if available
        if (originalMenuItem.itemId) {
          originalItem = db.Items.get(originalMenuItem.itemId);
          originalStock = originalItem.stock;

          originalItem.stock += original.qty * originalMenuItem.qty;
        }

        // Update the updated item if available
        if (updateMenuItem.itemId) {
          updateItem = db.Items.get(updateItem.itemId);
          updateStock = updateItem.stock;
          updateItem.stock -= update.qty * updateMenuItem.qty;
        }

        if (originalItem) {
          db.Items.fireListeners('update', { id: originalItem.id, stock: originalItem.stock }, { id: originalItem.id, stock: originalStock });
        }

        if (updateItem && updateItem !== originalItem) {
          db.Items.fireListeners('update', { id: updateItem.id, stock: updateItem.stock }, { id: updateItem.id, stock: updateStock });
        }
      }
    });
    db.Purchases.addListener('delete', (original) => {
      const item = db.Items.get(original.itemId);
      item.stock -= original.qty;
      db.Items.fireListeners('update', { id: item.id, stock: item.stock }, { id: item.id, stock: item.stock + original.qty });
    });
    db.OrderItems.addListener('delete', (original) => {
      const menuItem = db.MenuItems.get(original.menuItemId);
      if (menuItem.itemId) {
        const item = db.Items.get(menuItem.itemId);
        const oldStock = item.stock;
        item.stock += (original.qty * menuItem.qty);
        db.Items.fireListeners('update', { id: item.id, stock: item.stock }, { id: item.id, stock: oldStock });
      }
    });

    return items;
  });

  // Initialize the orders (only non completed and cancelled orders) along with the order items
  await db.Orders.init(async (name) => {
    const orders = await db.all(`SELECT * FROM [${name}] WHERE status NOT IN (?, ?)`, 'Completed', 'Cancelled');

    // Retreive OrderItem for all the orders
    await Promise.all(orders.map(async (order, idx) => {
      const items = await db.all('SELECT * FROM [OrderItem] WHERE orderId=?', order.id);
      orders[idx].items = items;
    }));

    // Listen to insert/delete for the order item records
    db.OrderItems.addListener('insert', (record) => {
      const order = db.Orders.get(record.orderId);
      if (order) {
        order.items.push(record);
        db.Orders.fireListeners('update', { id: order.id }, { id: order.id });
      }
    });

    db.OrderItems.addListener('delete', (record) => {
      const order = db.Orders.get(record.orderId);
      if (order) {
        const idx = order.items.findIndex(i => i.id === record.id);
        order.items.splice(idx, 1);
        db.Orders.fireListeners('update', { id: order.id }, { id: order.id });
      }
    });

    return orders;
  });

  return db;
};
