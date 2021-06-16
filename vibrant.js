const Vibrant = require('node-vibrant');
const { path } = require('./utils');

const COLOR_COUNT = 256;
const QUALITY = 3;

module.exports = (file) =>
	new Promise((resolve, reject) =>
		Vibrant.from(path(file.path))
			.maxColorCount(COLOR_COUNT).quality(QUALITY).getPalette()
			.catch(reject));
