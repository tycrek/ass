/**
 * Used for global data management
 */

const { JsonStorageEngine } = require('@tycrek/ass-storage-engine');
const data = new JsonStorageEngine();
module.exports = data;
