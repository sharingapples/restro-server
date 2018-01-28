const low = require('lowdb');
const md5 = require('md5');
const FileSync = require('lowdb/adapters/FileAsync');

const User = require('./User');
const models = require('../models');

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
