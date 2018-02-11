const bcrypt = require('bcrypt');
const DataStructure = require('./DataStructure');

const SALT_ROUNDS = 10;

class User extends DataStructure {
  constructor(db) {
    super(db, 'User');
  }

  insert(record) {
    const rec = Object.assign({}, record, {
      password: bcrypt.hashSync(record.password, SALT_ROUNDS),
    });
    return super.insert(rec);
  }

  update(record, id) {
    if (record.password) {
      const rec = Object.assign({}, record, {
        password: bcrypt.hashSync(record.password, SALT_ROUNDS),
      });
      return super.update(rec, id);
    }
    return super.update(record, id);
  }

  async verify(username, password) {
    const record = await this.findOne({ username });
    if (record && bcrypt.compareSync(password, record.password)) {
      return record;
    }

    return null;
  }
}

module.exports = User;
