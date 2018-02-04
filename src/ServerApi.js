class ServerApi {
  constructor(db, session, sessions) {
    this.db = db;
    this.session = session;
    this.sessions = sessions;
  }

  async sum(a, b) {
    return a+b;
  }
  async placeOrder(tableNo, orderItems) {
    if (!this.session.isWaiter()) {
      throw new Error('Access Denied');
    }

    const order = await this.db.get('orders').push({
      tableNo,
    }).write();

    order.items = await Promise.all(orderItems.map((orderItem) => {
      const { itemId, quantity, rate } = orderItem;
      return this.db.get('orderItems').push({
        itemId,
        quantity,
        rate,
        orderId: order.id,
      }).write();
    }));

    const { admins, cashiers } = this.sessions;

    this.sessions.dispatch([admins, cashiers], {
      type: 'ADD',
      schema: 'orders',
      payload: [order],
    });

    this.sessions.dispatch([admins, cashiers], {
      type: 'ADD',
      schema: 'orderItems',
      payload: order.items,
    });

    return order;
  }
}

module.exports = ServerApi;
