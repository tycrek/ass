import logger from '../logger';
import { onStart, users, setUserPassword } from '../auth';

if (process.argv.length < 4) {
	logger.error('Missing username/unid or password');
	process.exit(1);
} else {
	const id = process.argv[2];
	const password = process.argv[3];

	onStart(process.argv[4] || 'auth.json')
		.then(() => {
			const user = users.find((user) => user.unid === id || user.username === id);
			if (!user) throw new Error('User not found');
			else return setUserPassword(user.unid, password);
		})
		.then(() => logger.info('Password changed successfully').callback(() => process.exit(0)))
		.catch((err) => logger.error(err).callback(() => process.exit(1)));
}
