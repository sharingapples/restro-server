const CachedDataStructure = require('./CachedDataStructure');

class Order extends CachedDataStructure {
  async update(object, id) {
    const original = super.get(id);
    // If the object's status changes to 'Cancelled' or 'Completed'
    // then also remove the object from the cache
    const res = await super.update(object, id);
    if (object.status !== original.status && (object.status === 'Cancelled' || object.status === 'Completed')) {
      // Fire the delete listener as well
      delete super.cache(id);
      super.fireListeners('delete', original);
    }

    return res;
  }
}

module.exports = Order;
