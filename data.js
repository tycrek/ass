/**
 * Used for global data management
 */

const fs = require('fs-extra');
const { log, path } = require('./utils');

// Make sure data.json exists
if (!fs.existsSync(path('data.json'))) {
	fs.writeJsonSync(path('data.json'), {}, { spaces: 4 });
	log('File [data.json] created');
} else log('File [data.json] exists');

const data = require('./data.json');
module.exports = data;
