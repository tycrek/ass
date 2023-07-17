import express, { Request, Response, NextFunction, RequestHandler, json as BodyParserJson } from 'express';
import fs from 'fs-extra';
import { path, isProd } from '@tycrek/joint';
import { epcss } from '@tycrek/express-postcss';
import tailwindcss from 'tailwindcss';
import { log } from './log';
import { ensureFiles } from './data';
import { UserConfig } from './UserConfig';
import { ServerConfiguration } from 'ass';
import { MySql } from './sql/mysql';

/**
 * Custom middleware to attach the ass object (and construct the `host` property)
 */
function assMetaMiddleware(port: number, proxied: boolean): RequestHandler {
	return (req: Request, _res: Response, next: NextFunction) => {
		req.ass = { host: `${req.protocol}://${req.hostname}${proxied ? '' : `:${port}`}` };
		next();
	}
}

/**
 * Main function.
 * Yes I'm using main() in TS, cry about it
 */
async function main() {

	// Launch log
	const pkg = await fs.readJson(path.join('package.json')) as { name: string, version: string };
	log.blank().info(pkg.name, pkg.version).blank();

	// Ensure data files exist
	await ensureFiles();

	// Set default server configuration
	const serverConfig: ServerConfiguration = {
		host: '0.0.0.0',
		port: 40115,
		proxied: isProd()
	};

	// Replace with user details, if necessary
	try {
		const exists = await fs.pathExists(path.join('server.json'));
		if (exists) {

			// Read file
			const { host, port, proxied } = await fs.readJson(path.join('server.json')) as { host?: string, port?: number, proxied?: boolean };

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
	if (UserConfig.ready) await MySql.configure();

	// Set up Express
	const app = express();

	app.enable('case sensitive routing');
	app.disable('x-powered-by');

	app.set('trust proxy', serverConfig.proxied);
	app.set('view engine', 'pug');
	app.set('views', 'views2/');

	// Middleware
	app.use(log.express());
	app.use(BodyParserJson());
	app.use(assMetaMiddleware(serverConfig.port, serverConfig.proxied));

	// CSS
	app.use('/.css', epcss({
		cssPath: path.join('tailwind2.css'),
		plugins: [
			tailwindcss,
			(await import('autoprefixer')).default(),
			(await import('cssnano')).default(),
			(await import('@tinycreek/postcss-font-magician')).default(),
		],
		warn: (warning: Error) => log.warn('PostCSS', warning.toString())
	}));

	app.get('/.ass.host', (req, res) => res.send(req.ass.host));

	// Routing
	app.use('/setup', (await import('./routers/setup')).router);
	app.use('/', (await import('./routers/index')).router);

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
