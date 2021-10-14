import { AssRequest, FileData } from './definitions';
import fs from 'fs-extra';
import Path from 'path';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';
import { DateTime } from 'luxon';
import token from './generators/token';
import zwsGen from './generators/zws';
import randomGen from './generators/random';
import gfyGen from './generators/gfycat';
import logger from './logger';
const { HTTP, HTTPS, KILOBYTES } = require('../MagicNumbers.json');

// Catch config.json not existing when running setup script
try {
	var { useSsl, port, domain, isProxied, diskFilePath, s3bucket, s3endpoint, s3usePathStyle } = require('../config.json'); // skipcq: JS-0239, JS-0102
} catch (ex) {
	// @ts-ignore
	if (ex.code !== 'MODULE_NOT_FOUND') console.error(ex);
}

export function getTrueHttp() {
	return ('http').concat(useSsl ? 's' : '').concat('://');
}

export function getTrueDomain(d = domain) {
	return d.concat((port === HTTP || port === HTTPS || isProxied) ? '' : `:${port}`);
}

export function getS3url(s3key: string, ext: string) {
	return `https://${s3usePathStyle ? `${s3endpoint}/${s3bucket}` : `${s3bucket}.${s3endpoint}`}/${s3key}${ext}`;
}

export function getDirectUrl(resourceId: string) {
	return `${getTrueHttp()}${getTrueDomain()}/${resourceId}/direct`;
}

export function randomHexColour() { // From: https://www.geeksforgeeks.org/javascript-generate-random-hex-codes-color/
	const letters = '0123456789ABCDEF';
	let colour = '#';
	for (let i = 0; i < 6; i++) // skipcq: JS-0074
		colour += letters[(Math.floor(Math.random() * letters.length))];
	return colour;
}

export function getResourceColor(colorValue: string, vibrantValue: string) {
	return colorValue === '&random' ? randomHexColour() : colorValue === '&vibrant' ? vibrantValue : colorValue;
}

export function formatTimestamp(timestamp: number, timeoffset: string) {
	return DateTime.fromMillis(timestamp).setZone(timeoffset).toLocaleString(DateTime.DATETIME_MED);
}

export function formatBytes(bytes: number, decimals = 2) { // skipcq: JS-0074
	if (bytes === 0) return '0 Bytes';
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(KILOBYTES));
	return parseFloat((bytes / Math.pow(KILOBYTES, i)).toFixed(decimals < 0 ? 0 : decimals)).toString().concat(` ${sizes[i]}`);
}

export function replaceholder(data: string, size: number, timestamp: number, timeoffset: string, originalname: string) {
	return data
		.replace(/&size/g, formatBytes(size))
		.replace(/&filename/g, originalname)
		.replace(/&timestamp/g, formatTimestamp(timestamp, timeoffset));
}

export function arrayEquals(arr1: any[], arr2: any[]) {
	return arr1.length === arr2.length && arr1.slice().sort().every((value: string, index: number) => value === arr2.slice().sort()[index])
};

export function verify(req: AssRequest, users: JSON) {
	return req.headers.authorization && Object.prototype.hasOwnProperty.call(users, req.headers.authorization);
}

export function generateId(mode: string, length: number, gfyLength: number, originalName: string) {
	return (GENERATORS.has(mode) ? GENERATORS.get(mode)({ length, gfyLength }) : originalName);
}

// Set up pathing
export const path = (...paths: string[]) => Path.join(process.cwd(), ...paths);

const idModes = {
	zws: 'zws',     // Zero-width spaces (see: https://zws.im/)
	og: 'original', // Use original uploaded filename
	r: 'random',    // Use a randomly generated ID with a mixed-case alphanumeric character set
	gfy: 'gfycat'   // Gfycat-style ID's (https://gfycat.com/unsungdiscretegrub)
};

const GENERATORS = new Map();
GENERATORS.set(idModes.zws, zwsGen);
GENERATORS.set(idModes.r, randomGen);
GENERATORS.set(idModes.gfy, gfyGen);

export const isProd = require('@tycrek/isprod')();
module.exports = {
	path,
	getTrueHttp,
	getTrueDomain,
	getS3url,
	getDirectUrl,
	getResourceColor,
	formatTimestamp,
	formatBytes,
	replaceholder,
	randomHexColour,
	sanitize,
	verify,
	renameFile: (req: AssRequest, newName: string) => new Promise((resolve: Function, reject) => {
		try {
			const paths = [req.file!.destination, newName];
			fs.rename(path(req.file!.path), path(...paths));
			req.file!.path = Path.join(...paths);
			resolve();
		} catch (err) {
			reject(err);
		}
	}),
	generateToken: () => token(),
	generateId,
	arrayEquals,
	downloadTempS3: (file: FileData) => new Promise((resolve: Function, reject) =>
		fetch(getS3url(file.randomId, file.ext))
			.then((f2) => f2.body!.pipe(fs.createWriteStream(Path.join(__dirname, diskFilePath, sanitize(file.originalname))).on('close', () => resolve())))
			.catch(reject)),
}

export const log = logger;
/**
 * @type {TLog}
 */
module.exports.log = logger;
