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

    this.cache[res.id] = res;
    return res;
  }

  async update(object, id) {
    const res = await super.update(object, id);

    // Replace the record with the update values
    if (object.id && id !== object.id) {
      const obj = this.cache[id];
      delete this.cache[id];
      this.cache[object.id] = Object.assign(obj, object);
    } else {
      this.cache[id] = Object.assign(this.cache[id], object);
    }
    return res;
  }

  async delete(id) {
    const res = await super.delete(id);
    delete this.cache[id];
    return res;
  }
}

module.exports = CachedDataStructure;
