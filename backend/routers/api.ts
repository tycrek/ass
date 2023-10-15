import { Router, json as BodyParserJson, RequestHandler } from 'express';
import * as bcrypt from 'bcrypt'
import { log } from '../log';
import { UserConfig } from '../UserConfig';
import * as data from '../data';
import { AssUser, AssUserNewReq } from 'ass';
import { nanoid } from '../generators';
import { MySql } from '../sql/mysql';

/**
 * Validates a user login session
 */
const validateSessions: RequestHandler = (req, res, next) => {
	if (!req.session.ass) (log.debug('Session missing'), req.session.ass = {});

	// todo: actually authenticate (data.get needs to be updated for subproperties maybe)
	// data.get('')

	next();
};

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

		// Set data storage (not files) to SQL if required
		if (UserConfig.config.sql?.mySql != null)
			await Promise.all([MySql.configure(), data.setDataModeToSql()]);

		log.success('Setup', 'completed');

		return res.json({ success: true });
	} catch (err: any) {
		return res.status(400).json({ success: false, message: err.message });
	}
});

// User login
router.post('/login', BodyParserJson(), validateSessions, async (req, res) => {
	log.success('User logged in', req.body.username);
	res.json({ success: true, message: `User [${req.body.username}] logged in` });
});

// todo: authenticate API endpoints
router.post('/user', BodyParserJson(), async (req, res) => {
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

	if (issue) return res.status(400).json({ success: false, messsage: issue });

	log.debug(`User created`, user!.username);
	res.json(({ success: true, message: `User ${user!.username} created` }));
});

export { router };
