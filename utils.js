const fs = require('fs-extra');
const Path = require('path');

module.exports = {
	log: console.log,
	path: (...paths) => Path.join(__dirname, ...paths),
	saveData: (data) => fs.writeJsonSync(Path.join(__dirname, 'data.json'), data, { spaces: 4 }),
	verify: (req, tokens) => req.headers.authorization && tokens.includes(req.headers.authorization)
}