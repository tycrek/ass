const Vibrant = require('node-vibrant');
const { path } = require('./utils');
module.exports = (file) =>
	new Promise((resolve, reject) =>
		Vibrant.from(path(file.path)).getPalette()
			.then((palette) => resolve(palette.Vibrant.hex))
			.catch(reject));
