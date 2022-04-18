const fs = require('fs-extra');
const path = require('path');
const { s3enabled } = require('../config.json');
const { formatBytes } = require('./utils');
const { bucketSize } = require('./storage');

const { TLog } = require('@tycrek/log');
const log = new TLog({ level: 'debug', timestamp: { enabled: false } });

/**
 * Thank you CoPilot for helping write whatever the fuck this is -tycrek, 2022-04-18
 */
function whileWait(expression, timeout = 1000) {
	return new Promise(async (resolve, reject) => {
		while (expression())
			await new Promise((resolve) => setTimeout(resolve, timeout));
		resolve();
	});
}

module.exports = () => {
	const data = require('./data').data;
	const { users } = fs.readJsonSync(path.join(process.cwd(), 'auth.json'));
	Object.keys(users).forEach((token) => users[token].count = 0);

	let totalSize = 0;
	let oldSize = 0;
	let d = [];

	whileWait(() => data() === undefined)
		.then(() => data().get())
		.then((D) => (d = D.map(([, resource]) => resource)))
		.then(() =>
			d.forEach(({ token, size }) => {
				try {
					totalSize += size;
					if (token === undefined) oldSize += size; // skipcq: JS-0127
					else {
						if (!users[token].size) users[token].size = 0;
						users[token].size += size;
						users[token].count++;
					}
				} catch (ex) {
					// Silently handle missing tokens from dev environment -tycrek
				}
			}))
		.then(() => bucketSize())
		.then((s3size) => {
			log.info('---- Usage metrics ----')
				.blank()
				.info('Users', Object.keys(users).length)
				.info('Files', Object.keys(d).length)
				.info('S3 size', s3enabled ? s3size : '--')
				.blank()
				.info('Total size', formatBytes(totalSize))
				.info('Old files', formatBytes(oldSize))
				.blank();

			Object.values(users).forEach(({ username, count, size }) => log.info(`- ${username}`, formatBytes(size), `${count} files`));
			process.exit(0);
		})
		.catch(console.error);
}

if (require.main === module) module.exports();
