/**
 * Used for global auth management
 */

const fs = require('fs-extra');
const { log, path, arrayEquals, generateToken } = require('./utils');

// Make sure auth.json exists and generate the first key
if (!fs.existsSync(path('auth.json'))) {
	let users = {};
	users[generateToken()] = { username: 'ass', count: 0 };
	fs.writeJsonSync(path('auth.json'), { users }, { spaces: 4 });
	log(`File created: auth.json\n\n!! Important: save this token in a secure spot: ${Object.keys(users)[0]}`);
}

const users = require('./auth.json').users || {};

// Monitor auth.json for changes (triggered by running 'npm run new-token')
fs.watch(path('auth.json'), { persistent: false },
	(eventType) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json) => {
			if (!(arrayEquals(Object.keys(users), Object.keys(json.users)))) {
				Object.keys(json.users).forEach((token) => (!Object.prototype.hasOwnProperty.call(users, token)) && (users[token] = json.users[token]));
				log(`New token added: ${Object.keys(users)[Object.keys(users).length - 1]}`);
			}
		})
		.catch(console.error));

module.exports = users;
