import { FileData } from './types/definitions';
import fs from 'fs-extra';
import Path from 'path';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';
import { DateTime } from 'luxon';
import token from './generators/token';
import zwsGen from './generators/zws';
import randomGen from './generators/random';
import gfyGen from './generators/gfycat';
import tsGen from './generators/timestamp';
import { Request } from 'express';
import { isProd as ip } from '@tycrek/joint';
const { HTTP, HTTPS, KILOBYTES } = require('../MagicNumbers.json');

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

const idModes = {
	zws: 'zws',     // Zero-width spaces (see: https://zws.im/)
	og: 'original', // Use original uploaded filename
	r: 'random',    // Use a randomly generated ID with a mixed-case alphanumeric character set
	gfy: 'gfycat',   // Gfycat-style ID's (https://gfycat.com/unsungdiscretegrub)
	ts: 'timestamp', // Timestamp-based ID's
};
const GENERATORS = new Map();
GENERATORS.set(idModes.zws, zwsGen);
GENERATORS.set(idModes.r, randomGen);
GENERATORS.set(idModes.gfy, gfyGen);
GENERATORS.set(idModes.ts, tsGen);
export function generateId(mode: string, length: number, gfyLength: number, originalName: string) {
	return (GENERATORS.has(mode) ? GENERATORS.get(mode)({ length, gfyLength }) : originalName);
}

// Set up pathing
export const path = (...paths: string[]) => Path.join(process.cwd(), ...paths);

export const isProd = ip();
