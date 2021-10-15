import { FileData } from './definitions';
import Vibrant from 'node-vibrant';
import { randomHexColour } from './utils';

// Vibrant parameters
const COLOR_COUNT = 256;
const QUALITY = 3;

/**
 * Extracts a prominent colour from the provided image file
 * @param {*} file The image to extract a colour from
 * @param {*} resolve Runs if Promise was successful
 * @param {*} reject Runs if Promise failed
 */
function getVibrant(file: FileData, resolve: Function, reject: Function) {
	Vibrant.from(file.path)
		.maxColorCount(COLOR_COUNT)
		.quality(QUALITY)
		.getPalette()
		.then((palettes) => resolve(palettes[Object.keys(palettes).sort((a, b) => palettes[b]!.population - palettes[a]!.population)[0]]!.hex))
		.catch((err) => reject(err));
}

/**
 * Extracts a colour from an image file. Returns a random Hex value if provided file is a video
 * @param {*} file The file to get a colour from
 * @returns The Vibrant colour as a Hex value (or random Hex value for videos)
 */
export default (file: FileData): Promise<string> => new Promise((resolve, reject) => !file.is.image ? resolve(randomHexColour()) : getVibrant(file, resolve, reject)); // skipcq: JS-0229
