/**
 * Used for global data management
 */

let data;
try {
	data = require('./data.json');
} catch (ex) {
	console.error(ex);
	data = {};
}

module.exports = data;
