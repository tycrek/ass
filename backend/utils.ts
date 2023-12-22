import { DateTime } from 'luxon';
import { id } from 'william.js';

export const customId = (length: number, alphabet: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => id(length, 1, alphabet);

export const randomHexColour = () => { // From: https://www.geeksforgeeks.org/javascript-generate-random-hex-codes-color/
	const letters = '0123456789ABCDEF';
	let colour = '#';
	for (let i = 0; i < 6; i++)
		colour += letters[(Math.floor(Math.random() * letters.length))];
	return colour;
};

export const formatTimestamp = (timestamp: number, timeoffset: string) =>
	DateTime.fromMillis(timestamp).setZone(timeoffset).toLocaleString(DateTime.DATETIME_MED);

export const formatBytes = (bytes: number, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals < 0 ? 0 : decimals)).toString().concat(` ${sizes[i]}`);
};
