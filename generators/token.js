const uuid = require('uuid').v4;
const fs = require('fs-extra');
const path = require('path');
const randomGen = require('./random');

const MAX_USERNAME = 20;

module.exports = () => uuid().replace(/-/g, '');

// If directly called on the command line, generate a new token
if (require.main === module) {
	let token = module.exports();
	let authPath = path.join(__dirname, '..', 'auth.json');

	fs.readJson(authPath)
		.then((auth) => {
			auth.tokens.push(token);

			// Generate the user
			let username = process.argv[2] ? process.argv[2].replace(/[^\da-z]/gi, '').substring(0, MAX_USERNAME) : randomGen({ length: 20 });
			if (!auth.users) auth.users = {};
			if (Object.values(auth.users).findIndex((user) => user.username == username) != -1) {
				console.log('Username already exists!');
				process.exit(1);
			}
			auth.users[token] = { username, count: 0 };

			fs.writeJsonSync(authPath, auth, { spaces: 4 });
		})
		.then(() => console.log(`A new token has been generated and automatically applied. You do not need to restart 'ass'.\n\nYour token: ${token}`))
		.catch(console.error);
}
