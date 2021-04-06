const cryptoRandomString = require('crypto-random-string');
module.exports = (length) => cryptoRandomString({ length, type: 'alphanumeric' });
