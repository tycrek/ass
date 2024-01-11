import { AssUser, ServerConfiguration } from 'ass';

import fs from 'fs-extra';
import tailwindcss from 'tailwindcss';
import session from 'express-session';
import MemoryStore from 'memorystore';
import express, { Request, Response, NextFunction, RequestHandler, json as BodyParserJson } from 'express';
import { path, isProd } from '@tycrek/joint';
import { epcss } from '@tycrek/express-postcss';

import { log } from './log.js';
import { get } from './data.js';
import { UserConfig } from './UserConfig.js';
import { DBManager } from './sql/database.js';
import { JSONDatabase } from './sql/json.js';
import { MySQLDatabase } from './sql/mysql.js';
import { PostgreSQLDatabase } from './sql/postgres.js';
import { buildFrontendRouter } from './routers/_frontend.js';

/**
 * Top-level metadata exports
 */
export const App = {
	pkgVersion: ''
};

/**
 * Custom middleware to attach the ass object (and construct the `host` property)
 */
const assMetaMiddleware = (port: number, proxied: boolean): RequestHandler =>
	(req: Request, _res: Response, next: NextFunction) => {
		req.ass = {
			host: `${req.protocol}://${req.hostname}${proxied ? '' : `:${port}`}`,
			version: App.pkgVersion
		};

		// Set up Session if required
		if (!req.session.ass)
			(log.debug('Session missing'), req.session.ass = {});

		next();
	};

/**
 * Custom middleware to verify user access
 */
const loginRedirectMiddleware = (requireAdmin = false): RequestHandler =>
	async (req: Request, res: Response, next: NextFunction) => {

		// If auth doesn't exist yet, make the user login
		if (!req.session.ass?.auth) {
			log.warn('User not logged in', req.baseUrl);

			// Set pre-login path so user is directed to their requested page
			req.session.ass!.preLoginPath = req.baseUrl;

			// Redirect
			res.redirect('/login');
		} else {
			const user = (await get('users', req.session.ass.auth.uid)) as AssUser;

			// Check if user is admin
			if ((requireAdmin || req.baseUrl === '/admin') && !user.admin) {
				log.warn('Admin verification failed', user.username, user.id);
				res.sendStatus(403);
			} else next();
		}
	};

/**
 * Main function.
 * Yes I'm using main() in TS, cry about it
 */
async function main() {

	// Launch log
	const pkg = await fs.readJson(path.join('package.json')) as { name: string, version: string };
	log.blank().info(pkg.name, pkg.version).blank();

	App.pkgVersion = pkg.version;

	// Ensure data directory exists
	log.debug('Checking data dir')
	await fs.ensureDir(path.join('.ass-data'));

	// Set default server configuration
	const serverConfig: ServerConfiguration = {
		host: '0.0.0.0',
		port: 40115,
		proxied: isProd()
	};

	// Replace with user details, if necessary
	try {
		const exists = await fs.pathExists(path.join('.ass-data/server.json'));
		if (exists) {

			// Read file
			const { host, port, proxied } = await fs.readJson(path.join('.ass-data/server.json')) as { host?: string, port?: number, proxied?: boolean };

			// Set details, if available
			if (host) serverConfig.host = host;
			if (port) serverConfig.port = port;
			if (proxied != undefined) serverConfig.proxied = proxied;

			log.debug('server.json', `${host ? `host=${host},` : ''}${port ? `port=${port},` : ''}${proxied != undefined ? `proxied=${proxied},` : ''}`);
		}
	} catch (err) {
		log.error('Failed to read server.json');
		console.error(err);
		throw err;
	}

	// Attempt to load user configuration
	await new Promise((resolve) => UserConfig.readConfigFile().then(() => resolve(void 0))
		.catch((err) => (err.code && err.code === 'ENOENT' ? {} : console.error(err), resolve(void 0))));

	// If user config is ready, try to configure SQL
	if (UserConfig.ready && UserConfig.config.database != null) {
		try {
			switch (UserConfig.config.database?.kind) {
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
		} catch (err) { throw new Error(`Failed to configure SQL`); }
	} else { // default to json database
		log.debug('DB not set! Defaulting to JSON');
		await DBManager.use(new JSONDatabase());
	}

	// Set up Express
	const app = express();

	// Configure sessions
	const DAY = 86_400_000;
	app.use(session({
		name: 'ass',
		resave: true,
		saveUninitialized: false,
		cookie: { maxAge: DAY, secure: isProd() },
		secret: (Math.random() * 100).toString(),
		store: new (MemoryStore(session))({ checkPeriod: DAY }) as any,
	}));

	// Configure Express features
	app.enable('case sensitive routing');
	app.disable('x-powered-by');

	// Set Express variables
	app.set('trust proxy', serverConfig.proxied);
	app.set('view engine', 'pug');
	app.set('views', 'views/');

	// Middleware
	app.use(log.express());
	app.use(BodyParserJson());
	app.use(assMetaMiddleware(serverConfig.port, serverConfig.proxied));

	// Favicon
	app.use('/favicon.ico', (req, res) => res.redirect('https://i.tycrek.dev/ass'));

	// CSS
	app.use('/.css', epcss({
		cssPath: path.join('tailwind.css'),
		plugins: [
			tailwindcss,
			(await import('autoprefixer')).default(),
			(await import('cssnano')).default(),
			(await import('@tinycreek/postcss-font-magician')).default(),
		],
		warn: (warning: Error) => log.warn('PostCSS', warning.toString())
	}));

	// Metadata routes
	app.get('/.ass.host', (req, res) => res.type('text').send(req.ass.host));
	app.get('/.ass.version', (req, res) => res.type('text').send(req.ass.version));

	// Basic page routers
	app.use('/setup', buildFrontendRouter('setup', false));
	app.use('/login', buildFrontendRouter('login'));
	app.use('/admin', loginRedirectMiddleware(), buildFrontendRouter('admin'));
	app.use('/user', loginRedirectMiddleware(), buildFrontendRouter('user'));

	// Advanced routers
	app.use('/api', (await import('./routers/api.js')).router);
	app.use('/', (await import('./routers/index.js')).router);

	// Host app
	app.listen(serverConfig.port, serverConfig.host, () => log[UserConfig.ready ? 'success' : 'warn']('Server listening', UserConfig.ready ? 'Ready for uploads' : 'Setup required', `click http://127.0.0.1:${serverConfig.port}`));
}

// Start program
main().catch((err) => (console.error(err), process.exit(1)));

// Exit tasks
['SIGINT', 'SIGTERM'].forEach((signal) => process.addListener(signal as any, () => {

	// Hide ^C in console output
	process.stdout.write('\r');

	// Log then exit
	log.info('Exiting', `received ${signal}`);
	process.exit();
}));
