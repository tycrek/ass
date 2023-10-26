import fs from 'fs-extra';
import cryptoRandomString from 'crypto-random-string';
import { randomBytes, getRandomValues } from 'crypto';
import { path } from '@tycrek/joint';

type Length = { length: number, gfyLength?: number };

// todo: load gfy length from config file
const MIN_LENGTH_GFY = 2;

/**
 * Random generator
 */
export const random = ({ length }: Length) => cryptoRandomString({ length, type: 'alphanumeric' });

/**
 * Timestamp generator
 */
export const timestamp = () => `${Date.now()}`;

/**
 * Charset generator
 */
export const charset = ({ length, charset }: { length: number, charset: string[] }): string =>
	[...randomBytes(length)].map((byte) => charset[Number(byte) % charset.length]).join('').slice(1).concat(charset[0]);

/**
 * ZWS generator
 */
export const zws = ({ length }: Length) => charset({ length, charset: ['\u200B', '\u200C', '\u200D', '\u2060'] });

/**
 * Gfycat generator
 */
export const gfycat = ({ gfyLength }: Length) => {
	const count = gfyLength ?? MIN_LENGTH_GFY;

	const getWord = (list: string[], delim = '') =>
		list[Math.floor(Math.random() * list.length)].concat(delim);

	const adjectives = fs.readFileSync(path.join('./common/gfycat/adjectives.txt')).toString().split('\n');
	const animals = fs.readFileSync(path.join('./common/gfycat/animals.txt')).toString().split('\n');

	let gfycat = '';
	for (let i = 0; i < (count < MIN_LENGTH_GFY ? MIN_LENGTH_GFY : count); i++)
		gfycat += getWord(adjectives, '-');
	return gfycat.concat(getWord(animals));
};

export const nanoid = (size = 21) => getRandomValues(new Uint8Array(size)).reduce(((t, e) => t += (e &= 63) < 36 ? e.toString(36) : e < 62 ? (e - 26).toString(36).toUpperCase() : e > 62 ? "-" : "_"), "");