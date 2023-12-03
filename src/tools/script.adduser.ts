import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import logger from '../logger';
import { User } from '../types/auth';

// Port from config.json
const { port } = fs.readJsonSync(path.join(process.cwd(), 'config.json'));

// CLI key from auth.json
const { cliKey } = fs.readJsonSync(path.join(process.cwd(), 'auth.json'));

if (process.argv.length < 4) {
	logger.error('Missing username or password');
	logger.error('Usage: node script.adduser.js <username> <password> [admin] [meta]');
	process.exit(1);
} else {
	const username = process.argv[2];
	const password = process.argv[3];
	const admin = process.argv[4] ? process.argv[4].toLowerCase() === 'true' : false;
	const meta = process.argv[5] ? JSON.parse(process.argv[5]) : {};

	axios.post(`http://localhost:${port}/api/user`, { username, password, admin, meta }, { headers: { 'Authorization': cliKey } })
		.then((response) => {
			const user = response.data as User;
			logger.info('User created', `${username} (${user.unid})`, `token: ${user.token}`).callback(() => process.exit(0))
		})
		.catch((err) => logger.error(err).callback(() => process.exit(1)));
}
