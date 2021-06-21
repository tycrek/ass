const fs = require('fs-extra');
const crypto = require('crypto');
const toArray = require('stream-to-array')
const { path } = require('./utils');
const { s3enabled, diskFilePath } = require('./config.json');

module.exports = (file) =>
	new Promise((resolve, reject) =>
		toArray((fs.createReadStream(s3enabled ? path(diskFilePath, file.originalname) : path(file.path))))
			.then((parts) => Buffer.concat(parts.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part)))))
			.then((buf) => crypto.createHash('sha1').update(buf).digest('hex'))
			.then(resolve)
			.catch(reject));
