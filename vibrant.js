const Vibrant = require('node-vibrant');
const { randomHexColour } = require('./utils');

// Vibrant parameters
const COLOR_COUNT = 256;
const QUALITY = 3;

/**
 * Extracts a prominent colour from the provided image file
 * @param {*} file The image to extract a colour from
 * @param {*} resolve Runs if Promise was successful
 * @param {*} reject Runs if Promise failed
 */
function getVibrant(file, resolve, reject) {
	Vibrant.from(file.path)
		.maxColorCount(COLOR_COUNT)
		.quality(QUALITY)
		.getPalette()
		.then((palettes) => resolve(palettes[Object.keys(palettes).sort((a, b) => palettes[b].population - palettes[a].population)[0]].hex))
		.catch(reject);
}

/**
 * Extracts a colour from an image file. Returns a random Hex value if provided file is a video
 * @param {*} file The file to get a colour from
 * @returns The Vibrant colour as a Hex value (or random Hex value for videos)
 */
module.exports = (file) => new Promise((resolve, reject) => file.mimetype.includes('video') ? resolve(randomHexColour()) : getVibrant(file, resolve, reject));
