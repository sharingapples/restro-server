const DataStructure = require('./DataStructure');

class CachedDataStructure extends DataStructure {
  async init(fn) {
    const records = fn ? (await fn(this.name, this.db)) : (await super.all());
    if (!Array.isArray(records)) {
      throw new Error(`Cache must be initialized with an array of records. [${this.name}] Data Structure Got ${records}`);
    }
    this.cache = records.reduce((res, rec) => {
      res[rec.id] = rec;
      return res;
    }, {});
  }

  get(id) {
    return this.cache[id];
  }

  all() {
    return Object.keys(this.cache).map(id => this.cache[id]);
  }

  async insert(object) {
    const res = await super.insert(object);

    this.cache.push(res);
    return res;
  }

  async update(object, id) {
    const res = await super.update(object, id);

    // Replace the record with the update values
    this.cache.forEach(r => (r.id !== id ? r : Object.assign(r, object)));
    return res;
  }

  async delete(id) {
    const res = await super.delete(id);
    const idx = this.cache.findIndex(r => r.id === id);
    this.cache.splice(idx, 1);

    return res;
  }
}

module.exports = CachedDataStructure;
