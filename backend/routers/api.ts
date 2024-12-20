import { AssUser, AssUserNewReq } from 'ass';

import * as bcrypt from 'bcrypt'
import { Router, json as BodyParserJson, RequestHandler } from 'express';

import * as data from '../data.js';
import { log } from '../log.js';
import { nanoid } from '../generators.js';
import { UserConfig } from '../UserConfig.js';
import { rateLimiterMiddleware, setRateLimiter } from '../ratelimit.js';
import { DBManager } from '../sql/database.js';
import { JSONDatabase } from '../sql/json.js';
import { MySQLDatabase } from '../sql/mysql.js';
import { PostgreSQLDatabase } from '../sql/postgres.js';

const router = Router({ caseSensitive: true });

// Setup route
router.post('/setup', BodyParserJson(), async (req, res) => {
	if (UserConfig.ready)
		return res.status(409).json({ success: false, message: 'User config already exists' });

	log.info('Setup', 'initiated');

	try {
		// Parse body
		new UserConfig(req.body);

		// Save config
		await UserConfig.saveConfigFile();

		// set up new databases
		if (UserConfig.config.database) {
			switch (UserConfig.config.database.kind) {
				case 'json':
					await DBManager.use(new JSONDatabase());
					break;
				case 'mysql':
					await DBManager.use(new MySQLDatabase());
					break;
				case 'postgres':
					await DBManager.use(new PostgreSQLDatabase());
					break;
			}
		}

		// set rate limits
		if (UserConfig.config.rateLimit?.api) setRateLimiter('api', UserConfig.config.rateLimit.api);
		if (UserConfig.config.rateLimit?.login) setRateLimiter('login', UserConfig.config.rateLimit.login);
		if (UserConfig.config.rateLimit?.upload) setRateLimiter('upload', UserConfig.config.rateLimit.upload);;

		log.success('Setup', 'completed');

		return res.json({ success: true });
	} catch (err: any) {
		log.error('Setup failed', err);
		return res.status(400).json({ success: false, message: err.message });
	}
});

// User login
router.post('/login', rateLimiterMiddleware('login', UserConfig.config?.rateLimit?.login), BodyParserJson(), (req, res) => {
	const { username, password } = req.body;

	data.getAll('users')
		.then((users) => {
			if (!users) throw new Error('Missing users data');
			else return Object.entries(users as AssUser[])
				.filter(([_uid, user]: [string, AssUser]) => user.username === username)[0][1]; // [0] is the first item in the filter results, [1] is AssUser
		})
		.then((user) => Promise.all([bcrypt.compare(password, user.password), user]))
		.then(([success, user]) => {
			success ? log.success('User logged in', user.username)
				: log.warn('User failed to log in', user.username);

			// Set up the session information
			if (success) req.session.ass!.auth = {
				uid: user.id,
				token: ''
			};

			// Respond
			res.json({ success, message: `User [${user.username}] ${success ? 'logged' : 'failed to log'} in`, meta: { redirectTo: req.session.ass?.preLoginPath ?? '/user' } });

			// Delete the pre-login path after successful login
			if (success) delete req.session.ass?.preLoginPath;
		})
		.catch((err) => log.error(err).callback(() => res.status(400).json({ success: false, message: err.message })));
});

// todo: authenticate API endpoints
router.post('/user', rateLimiterMiddleware('api', UserConfig.config?.rateLimit?.api), BodyParserJson(), async (req, res) => {
	if (!UserConfig.ready)
		return res.status(409).json({ success: false, message: 'User config not ready' });

	const newUser = req.body as AssUserNewReq;

	// Run input validation
	let issue: false | string = false;
	let user: AssUser;
	try {

		// Username check
		if (!newUser.username) issue = 'Missing username';
		newUser.username.replaceAll(/[^A-z0-9_-]/g, '');
		if (newUser.username === '') issue = 'Invalid username';

		// Password check
		if (!newUser.password) issue = 'Missing password';
		if (newUser.password === '') issue = 'Invalid password';
		newUser.password = newUser.password.substring(0, 128);

		// todo: figure out how to check admin:boolean and meta:{}

		// Create new AssUser objet
		user = {
			id: nanoid(32),
			username: newUser.username,
			password: await bcrypt.hash(newUser.password, 10),
			admin: newUser.admin ?? false,
			meta: newUser.meta ?? {},
			tokens: [],
			files: []
		};

		log.debug(`Creating ${user.admin ? 'admin' : 'regular'} user`, user.username, user.id);

		// todo: also check duplicate usernames
		await data.put('users', user.id, user);

	} catch (err: any) { issue = `Error: ${err.message}`; }

	if (issue) {
		log.error('Failed to create user', issue);
		return res.status(400).json({ success: false, messsage: issue });
	}

	log.debug(`User created`, user!.username);
	res.json(({ success: true, message: `User ${user!.username} created` }));
});

export { router };
