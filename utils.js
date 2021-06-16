const fs = require('fs-extra');
const Path = require('path');
const token = require('./generators/token');
const zwsGen = require('./generators/zws');
const randomGen = require('./generators/random');
const gfyGen = require('./generators/gfycat');

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
	log: console.log,
	path: (...paths) => Path.join(__dirname, ...paths),
	saveData: (data) => fs.writeJsonSync(Path.join(__dirname, 'data.json'), data, { spaces: 4 }),
	verify: (req, users) => req.headers.authorization && users.hasOwnProperty(req.headers.authorization),
	generateToken: () => token(),
	generateId: (mode, length, gfyLength, originalName) => GENERATORS.has(mode) ? GENERATORS.get(mode)({ length, gfyLength }) : originalName,
	formatBytes: (bytes, decimals = 2) => {
		if (bytes === 0) return '0 Bytes';
		let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		let i = Math.floor(Math.log(bytes) / Math.log(1024));
		return parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
	},
	randomHexColour: () => { // From: https://www.geeksforgeeks.org/javascript-generate-random-hex-codes-color/
		let letters = "0123456789ABCDEF";
		let colour = '#';
		for (var i = 0; i < 6; i++)
			colour += letters[(Math.floor(Math.random() * 16))];
		return colour;
	},
	arrayEquals: (arr1, arr2) => arr1.length === arr2.length && arr1.slice().sort().every((value, index) => value === arr2.slice().sort()[index])
}
