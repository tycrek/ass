import { FileData } from './types/definitions';
import Vibrant from 'node-vibrant';
import sharp from 'sharp';
import { randomHexColour } from './utils';

// Vibrant parameters
const COLOR_COUNT = 256;
const QUALITY = 3;

/**
 * Extracts a prominent colour from the provided image file
 */
function getVibrant(file: FileData, resolve: Function, reject: Function) {
	sharp(file.path).png().toBuffer()
		.then((data) => Vibrant.from(data)
			.maxColorCount(COLOR_COUNT)
			.quality(QUALITY)
			.getPalette())
		.then((palettes) => resolve(palettes[Object.keys(palettes).sort((a, b) => palettes[b]!.population - palettes[a]!.population)[0]]!.hex))
		.catch((err) => reject(err));
}

/**
 * Extracts a colour from an image file. Returns a random Hex value if provided file is a video
 */
export default (file: FileData): Promise<string> => new Promise((resolve, reject) => (!file.is.image || file.mimetype.includes('webp')) ? resolve(randomHexColour()) : getVibrant(file, resolve, reject)); // skipcq: JS-0229
