/**
 * Used for global data management
 */

let data = {};
try {
	data = require('./data.json');
} catch (ex) {
	data = {};
}

module.exports = data;
