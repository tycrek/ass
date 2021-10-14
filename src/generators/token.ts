import { v4 as uuid } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import randomGen from './random';
const TLog = require('@tycrek/log');
const log = new TLog();

const MAX_USERNAME = 20;

export default () => uuid().replace(/-/g, '');
module.exports = () => uuid().replace(/-/g, '');

// If directly called on the command line, generate a new token
if (require.main === module) {
	const token = module.exports();
	const authPath = path.join(process.cwd(), 'auth.json');
	let name = '';

	fs.readJson(authPath)
		.then((auth) => {
			// Generate the user
			const username = process.argv[2] ? process.argv[2].replace(/[^\da-z_]/gi, '').substring(0, MAX_USERNAME) : randomGen({ length: 20 }); // skipcq: JS-0074
			if (!auth.users) auth.users = {};
			if (Object.values(auth.users).findIndex((user: any) => user.username === username) !== -1) {
				log.error('Username already exists', username);
				process.exit(1);
			}
			auth.users[token] = { username, count: 0 };
			name = auth.users[token].username;

			fs.writeJsonSync(authPath, auth, { spaces: 4 });
		})
		.then(() => log
			.comment('A new token has been generated and automatically applied.')
			.comment('You do not need to restart \'ass\'.')
			.success('Your token', token, `username: ${name}`))
		.catch(log.c.error);
}
