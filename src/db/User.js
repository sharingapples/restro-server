const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

module.exports = {
  create: (username, name, role, password) => ({
    username,
    name,
    role,
    password: bcrypt.hashSync(password, SALT_ROUNDS),
  }),
  verify: (user, password) => bcrypt.compareSync(password, user.password),
  changePassword: (user, password) => (
    Object.assign({}, user, { password: bcrypt.hashSync(password, SALT_ROUNDS) })
  ),
};
