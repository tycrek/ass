const fs = require('fs-extra');
const Path = require('path');
const zwsGen = require('./idgen/zws');
const randomGen = require('./idgen/random');

const idModes = {
	zws: 'zws',     // Zero-width spaces (see: https://zws.im/)
	og: 'original', // Use original uploaded filename
	r: 'random'     // Use a randomly generated ID with a mixed-case alphanumeric character set
	// todo: gfycat-style ID's (example.com/correct-horse-battery-staple)
};

module.exports = {
	log: console.log,
	path: (...paths) => Path.join(__dirname, ...paths),
	saveData: (data) => fs.writeJsonSync(Path.join(__dirname, 'data.json'), data, { spaces: 4 }),
	verify: (req, tokens) => req.headers.authorization && tokens.includes(req.headers.authorization),
	generateId: (mode, lenth, originalName) =>
		(mode == idModes.zws) ? zwsGen(lenth)
			: (mode == idModes.r) ? randomGen(lenth)
				: originalName
}