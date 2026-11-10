const bcrypt = require('bcryptjs');
exports.hashPassword = (plain) => bcrypt.hash(plain, 10);
exports.comparePassword = (plain, hash) => bcrypt.compare(plain, hash);