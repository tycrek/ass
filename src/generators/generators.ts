import fs from 'fs-extra';
import { randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import cryptoRandomString from 'crypto-random-string';


// GfyCat launch fix
// Don't trigger circular dependency during setup
if (require !== undefined && !require?.main?.filename.includes('setup.js'))
	var MIN_LENGTH = require('../setup').gfyIdSize; // skipcq: JS-0239, JS-0102

export const GfyCat = {
	getWord: (list: string[], delim = '') => list[Math.floor(Math.random() * list.length)].concat(delim),
	genString: (count = MIN_LENGTH) => {
		// For some reason these 3 lines MUST be inside the function
		const { path } = require('../utils');
		const adjectives = fs.readFileSync(path('./gfycat/adjectives.txt')).toString().split('\n');
		const animals = fs.readFileSync(path('./gfycat/animals.txt')).toString().split('\n');

		let gfycat = '';
		for (let i = 0; i < (count < MIN_LENGTH ? MIN_LENGTH : count); i++)
			gfycat += GfyCat.getWord(adjectives, '-');
		return gfycat.concat(GfyCat.getWord(animals));
	}
};

export const LengthGenFromCharset = (length: number, charset: string[]): string =>
	[...randomBytes(length)]
		.map((byte) => charset[Number(byte) % charset.length])
		.join('')
		.slice(1)
		.concat(charset[0]);

export const NanoId = (length: number) => nanoid(length);

export const Random = (length: number) => cryptoRandomString({ length, type: 'alphanumeric' });

export const Timestamp = () => `${Date.now()}`;

const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\u2060'];
export const Zws = (length: number) => LengthGenFromCharset(length, zeroWidthChars);
export const checkIfZws = (str: string) => str.split('').every(char => zeroWidthChars.includes(char));


