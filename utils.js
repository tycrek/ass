const fs = require('fs-extra');
const Path = require('path');
const TLog = require('@tycrek/log');
const fetch = require('node-fetch');
const sanitize = require('sanitize-filename');
const { DateTime } = require('luxon');
const token = require('./generators/token');
const zwsGen = require('./generators/zws');
const randomGen = require('./generators/random');
const gfyGen = require('./generators/gfycat');
const { HTTP, HTTPS, KILOBYTES } = require('./MagicNumbers.json');

// Catch config.json not existing when running setup script
try {
	var { useSsl, port, domain, isProxied, diskFilePath, saveWithDate, s3bucket, s3endpoint, s3usePathStyle } = require('./config.json'); // skipcq: JS-0239, JS-0102
} catch (ex) {
	if (ex.code !== 'MODULE_NOT_FOUND') console.error(ex);
}

function getTrueHttp() {
	return ('http').concat(useSsl ? 's' : '').concat('://');
}

function getTrueDomain(d = domain) {
	return d.concat((port === HTTP || port === HTTPS || isProxied) ? '' : `:${port}`);
}

function getS3url(s3key, ext) {
	return `https://${s3usePathStyle ? `${s3endpoint}/${s3bucket}` : `${s3bucket}.${s3endpoint}`}/${s3key}${ext}`;
}

function getDirectUrl(resourceId) {
	return `${getTrueHttp()}${getTrueDomain()}/${resourceId}/direct`;
}

function randomHexColour() { // From: https://www.geeksforgeeks.org/javascript-generate-random-hex-codes-color/
	const letters = '0123456789ABCDEF';
	let colour = '#';
	for (let i = 0; i < 6; i++) // skipcq: JS-0074
		colour += letters[(Math.floor(Math.random() * letters.length))];
	return colour;
}

function getResourceColor(colorValue, vibrantValue) {
	return colorValue === '&random' ? randomHexColour() : colorValue === '&vibrant' ? vibrantValue : colorValue;
}

function formatTimestamp(timestamp) {
	return DateTime.fromMillis(timestamp).toLocaleString(DateTime.DATETIME_MED);
}

function formatBytes(bytes, decimals = 2) { // skipcq: JS-0074
	if (bytes === 0) return '0 Bytes';
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(KILOBYTES));
	return parseFloat((bytes / Math.pow(KILOBYTES, i)).toFixed(decimals < 0 ? 0 : decimals)).toString().concat(` ${sizes[i]}`);
}

function replaceholder(data, size, timestamp, originalname) {
	return data
		.replace(/&size/g, formatBytes(size))
		.replace(/&filename/g, originalname)
		.replace(/&timestamp/g, formatTimestamp(timestamp));
}

function getDatedDirname() {
	if (!saveWithDate) return diskFilePath;

	// Get current month and year
	const [month, , year] = new Date().toLocaleDateString('en-US').split('/');

	// Add 0 before single digit months (6 turns into 06)
	return `${diskFilePath}${diskFilePath.endsWith('/') ? '' : '/'}${year}-${`0${month}`.slice(-2)}`; // skipcq: JS-0074
}

// Set up pathing & the logger
const path = (...paths) => Path.join(__dirname, ...paths);
const logger = new TLog({
	level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
	timestamp: {
		enabled: true,
		colour: 'grey',
		preset: 'DATETIME_MED'
	},
});

// Enable the Express logger
logger
	.env('ASS_ENV')
	//.enable.process({ uncaughtException: false }).debug('Plugin enabled', 'Process')
	.enable.express().debug('Plugin enabled', 'Express')
	.enable.socket().debug('Plugin enabled', 'Socket');

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

module.exports = {
	isProd: require('@tycrek/isprod')(),
	path,
	getTrueHttp,
	getTrueDomain,
	getS3url,
	getDirectUrl,
	getResourceColor,
	formatTimestamp,
	formatBytes,
	replaceholder,
	getDatedDirname,
	randomHexColour,
	sanitize,
	verify: (req, users) => req.headers.authorization && Object.prototype.hasOwnProperty.call(users, req.headers.authorization),
	renameFile: (req, newName) => new Promise((resolve, reject) => {
		try {
			const paths = [req.file.destination, newName];
			fs.rename(path(req.file.path), path(...paths));
			req.file.path = Path.join(...paths);
			resolve();
		} catch (err) {
			reject(err);
		}
	}),
	generateToken: () => token(),
	generateId: (mode, length, gfyLength, originalName) => (GENERATORS.has(mode) ? GENERATORS.get(mode)({ length, gfyLength }) : originalName),
	arrayEquals: (arr1, arr2) => arr1.length === arr2.length && arr1.slice().sort().every((value, index) => value === arr2.slice().sort()[index]),
	downloadTempS3: (file) => new Promise((resolve, reject) =>
		fetch(getS3url(file.randomId, file.ext))
			.then((f2) => f2.body.pipe(fs.createWriteStream(Path.join(__dirname, diskFilePath, sanitize(file.originalname))).on('close', () => resolve())))
			.catch(reject)),
}

/**
 * @type {TLog}
 */
module.exports.log = logger;
