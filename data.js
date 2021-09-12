/**
 * Used for global data management
 */

const { JsonStorageEngine } = require('@tycrek/papito');
const data = new JsonStorageEngine();
module.exports = data;
