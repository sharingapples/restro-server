const CachedDataStructure = require('./CachedDataStructure');

class Order extends CachedDataStructure {
  async update(object, id) {
    const original = this.get(id);
    // If the object's status changes to 'Cancelled' or 'Completed'
    // then also remove the object from the cache
    const res = await super.update(object, id);
    if (object.status !== original.status && (object.status === 'Cancelled' || object.status === 'Completed')) {
      // Fire the delete listener as well
      delete this.cache[id];
      super.fireListeners('delete', original);

      if (object.status === 'Cancelled') {
        // Since the order items have been cancelled, update the stock for
        // recalculate stock for all the affected items
        original.items.forEach((orderItem) => {
          const menuItem = this.db.MenuItems.get(orderItem.menuItemId);
          const item = this.db.Items.get(menuItem.itemId);

          if (item) {
            const originalStock = item.stock || 0;
            item.stock = originalStock + (menuItem.qty * orderItem.qty);
            this.db.Items.fireListeners('update', { id: item.id, stock: item.stock }, { id: item.id, stock: originalStock });
          }
        });
      }
    } else {
      // Update the list of items
      const items = await this.db.OrderItems.all('orderId=?', id);
      this.get(id).items = items;
      this.fireListeners('update', this.get(id));
    }

    return res;
  }
}

module.exports = Order;
