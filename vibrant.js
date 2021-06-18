const Vibrant = require('node-vibrant');
const { path, randomHexColour } = require('./utils');
const { s3enabled } = require('./config.json');

const COLOR_COUNT = 256;
const QUALITY = 3;

module.exports = (file) =>
	new Promise((resolve, reject) => (
		file.mimetype.includes('video')
			? resolve(randomHexColour())
			: Vibrant.from(s3enabled ? path('uploads/', file.originalname) : path(file.path))
				.maxColorCount(COLOR_COUNT).quality(QUALITY).getPalette()
				.then((palettes) => resolve(palettes[Object.keys(palettes).sort((a, b) => palettes[b].population - palettes[a].population)[0]].hex))
				.catch(reject)));
