const uuid = require('uuid').v4;
const fs = require('fs-extra');
const path = require('path');

module.exports = () => uuid().replace(/-/g, '');

// If directly called on the command line, generate a new token
if (require.main === module) {
	let token = module.exports();
	let authPath = path.join(__dirname, '..', 'auth.json');

	fs.readJson(authPath)
		.then((auth) => {
			auth.tokens.push(token);
			fs.writeJsonSync(authPath, auth, { spaces: 4 });
		})
		.then(() => console.log(`A new token has been generated and automatically applied. You do not need to restart 'ass'.\n\nYour token: ${token}`))
		.catch(console.error);
}
