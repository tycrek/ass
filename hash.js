const fs = require('fs-extra');
const crypto = require('crypto');
const toArray = require('stream-to-array')

/**
 * Generates a SHA1 hash for the provided file
 * @param {*} file The file to hash
 * @returns The SHA1 hash
 */
module.exports = (file) =>
	new Promise((resolve, reject) =>
		toArray((fs.createReadStream(file.path)))
			.then((parts) => Buffer.concat(parts.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part)))))
			.then((buf) => crypto.createHash('sha1').update(buf).digest('hex')) // skipcq: JS-D003
			.then(resolve)
			.catch(reject));
