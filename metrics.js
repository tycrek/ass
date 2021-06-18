const fs = require('fs-extra');
const path = require('path');
const { s3enabled } = require('./config.json');
const { formatBytes } = require('./utils');
const { bucketSize } = require('./storage');

module.exports = () => {
	let data = fs.readJsonSync(path.join(__dirname, 'data.json'));
	let { users } = fs.readJsonSync(path.join(__dirname, 'auth.json'));

	let totalSize = 0;
	let oldSize = 0;
	Object.values(data).forEach(({ token, size }) => {
		try {
			totalSize += size;
			if (token === undefined) oldSize += size;
			else {
				if (!users[token].size) users[token].size = 0;
				users[token].size += size;
			}
		} catch (ex) {
			// Silently handle missing tokens from dev environment -tycrek
		}
	});

	// Get AWS size
	bucketSize()
		.then((s3size) => {
			console.log('---- Usage metrics ----\n');
			console.log(`Users: ${Object.keys(users).length}`);
			console.log(`Files: ${Object.keys(data).length}`);
			console.log(`S3 size: ${s3enabled ? s3size : '--'}`);
			console.log('');
			console.log(`Total size: ${formatBytes(totalSize)}`);
			console.log(`Untracked size: ${formatBytes(oldSize)}`);
			console.log('');

			Object.values(users).forEach(({ username, count, size }) => {
				console.log(`- ${username}: ${formatBytes(size)} (${count} files)`);
			});
		})
		.catch(console.error);
}

if (require.main === module) module.exports();
