import * as fs from 'fs-extra';
import * as Path from 'path';
import { default as token } from './generators/token.js';
import { default as zwsGen } from './generators/zws.js';
import { default as randomGen } from './generators/random.js';

const idModes = {
	zws: 'zws',     // Zero-width spaces (see: https://zws.im/)
	og: 'original', // Use original uploaded filename
	r: 'random'     // Use a randomly generated ID with a mixed-case alphanumeric character set
	// todo: gfycat-style ID's (example.com/correct-horse-battery-staple)
};

export const log = console.log;
export const path = (...paths: string[]): string => Path.join(__dirname, ...paths);
export const saveData = (data: object) => fs.writeJsonSync(Path.join(__dirname, '..', 'data.json'), data, { spaces: 4 });
export const verify = (req, tokens: string[]): boolean => req.headers.authorization && tokens.includes(req.headers.authorization);
export const generateToken = (): string => token();
export const generateId = (mode: string, lenth: number, originalName: string): string => // todo: TS interface for mode
	(mode == idModes.zws) ? zwsGen(lenth)
		: (mode == idModes.r) ? randomGen(lenth)
			: originalName;
export const formatBytes = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return '0 Bytes';
	let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	let i = Math.floor(Math.log(bytes) / Math.log(1024));
	return parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
}
export const randomHexColour = (): string => { // From: https://www.geeksforgeeks.org/javascript-generate-random-hex-codes-color/
	let letters = "0123456789ABCDEF";
	let colour = '#';
	for (var i = 0; i < 6; i++) colour += letters[(Math.floor(Math.random() * 16))];
	return colour;
}
