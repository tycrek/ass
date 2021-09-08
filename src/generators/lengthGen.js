const { randomBytes } = require('crypto');
module.exports = (length, charset) => [...randomBytes(length)].map((byte) => charset[Number(byte) % charset.length]).join('').slice(1).concat(charset[0]);