const low = require('lowdb');
const md5 = require('md5');
const FileSync = require('lowdb/adapters/FileAsync');

const User = require('./User');
const models = require('../models');

const MAX_RECORDS = 10000; // The maximum number of records to keep in each model
const LIMIT_RECORDS = 5000; // The number of records to keep once max records is reached

const defaultValue = {
  users: [User.create('super', 'Super User', 'super', 'PImas123*')],
};

Object.keys(models).forEach((model) => {
  defaultValue[model] = [];
});

module.exports = async function createDatabase() {
  const adapter = new FileSync('restro.db', {
    defaultValue,
    serialize: (data) => {
      // Keep the maximum record count to a limit
      Object.keys(models).forEach((model) => {
        const m = data[model];
        if (m && m.length > MAX_RECORDS) {
          m.splice(0, m.length - LIMIT_RECORDS);
        }
      });

      const str = JSON.stringify(data);
      const checksum = md5(`${str}.AVOID_TAMPERING`);
      return `[${checksum},${str}]`;
    },
    deserialize: (str) => {
      const md5sum = str.substr(1, 32);
      const data = str.substr(34, str.length - 35);
      if (md5sum !== md5(`${data}.AVOID_TAMPERING`)) {
        throw new Error('Data Corrupted');
      }
      return JSON.parse(data);
    },
  });

  const db = await low(adapter);

  db.defaults().write();

  db.User = User;
  return db;
};
