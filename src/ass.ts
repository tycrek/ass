import { ErrWrap } from './types/definitions';
import { Config, MagicNumbers, Package } from 'ass-json';

//#region Imports
import fs from 'fs-extra';
import express, { Request, Response } from 'express';
import nofavicon from '@tycrek/express-nofavicon';
import { epcss } from '@tycrek/express-postcss';
import tailwindcss from 'tailwindcss';
import helmet from 'helmet';

import { path, log, getTrueHttp, getTrueDomain } from './utils';
//#endregion

//#region Setup - Run first time setup if using Docker (pseudo-process, setup will be run with docker exec)
import { doSetup } from './setup';
const configPath = path('config.json');
if (!fs.existsSync(configPath) || fs.readFileSync(configPath).toString().length === 0) {
	doSetup();
	// @ts-ignore
	return;
}
//#endregion

// Load the JSON
const { host, port, useSsl, isProxied, s3enabled, frontendName, useSia, diskFilePath }: Config = fs.readJsonSync(path('config.json'));
const { CODE_INTERNAL_SERVER_ERROR }: MagicNumbers = fs.readJsonSync(path('MagicNumbers.json'));
const { name, version, homepage }: Package = fs.readJsonSync(path('package.json'));

//#region Local imports
import uploadRouter from './routers/upload';
import resourceRouter from './routers/resource';
//#endregion

// Welcome :D
log.blank().info(`* ${name} v${version} *`).blank();

//#region Variables, module setup
const app = express();
const ROUTERS = {
	upload: uploadRouter,
	resource: resourceRouter
};

// Read users and data
import { users } from './auth';
import { data } from './data';
//#endregion

// Create thumbnails directory
fs.ensureDirSync(path(diskFilePath, 'thumbnails'));

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', isProxied);
app.set('view engine', 'pug');

// Rate limiting using express-brute
// ! Notice !
// The rate limiting used here is very trivial and should be used with caution.
// I plan to improve this in the future somehow (possibly with redis, who knows).
// - tycrek, 2022-08-18
// todo: fix this eventually
import ExpressBrute from 'express-brute';
const bruteforce = new ExpressBrute(new ExpressBrute.MemoryStore(), {
	freeRetries: 50,
	minWait: 50, // 50ms
	maxWait: 500, // 500ms
	lifetime: 5, // 5 seconds
	failCallback: (_req, res, _next, _nextValidRequestDate) => res.sendStatus(429),
});

// Routes to protect
app.get(['/'], bruteforce.prevent, (_req, _res, next) => next());

// Express logger middleware
app.use(log.middleware());

// Helmet security middleware
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.xssFilter());
app.use(helmet.referrerPolicy());
app.use(helmet.dnsPrefetchControl());
useSsl && app.use(helmet.hsts({ preload: true })); // skipcq: JS-0093

// Don't process favicon requests
app.use(nofavicon);

// Use custom index, otherwise render README.md
type ASS_INDEX_TYPE = 'html' | 'js' | undefined;
const ASS_INDEX: ASS_INDEX_TYPE = fs.existsSync(path('share', 'index.html')) ? 'html' : fs.existsSync(path('share', 'index.js')) ? 'js' : undefined;
app.get('/', (req, res, next) =>
	ASS_INDEX === 'html' ? res.sendFile(path('share', 'index.html')) :
		ASS_INDEX === 'js' ? require(path('share', 'index.js'))(req, res, next) : // skipcq: JS-0359
			res.redirect(homepage))

// Set up custom frontend
const ASS_FRONTEND = fs.existsSync(path(`./${frontendName}/package.json`)) ? (require('submodule'), require(`../${frontendName}`)) : { enabled: false };
ASS_FRONTEND.enabled && app.use(ASS_FRONTEND.endpoint, ASS_FRONTEND.router); // skipcq: JS-0093

// Upload router (has to come after custom frontends as express-busboy interferes with all POST calls)
app.use('/', ROUTERS.upload);

// CSS
app.use('/css', epcss({
	cssPath: path('tailwind.css'),
	plugins: [
		tailwindcss,
		require('autoprefixer')(),
		require('cssnano')(),
		require('postcss-font-magician')(),
	],
	warn: (warning: Error) => log.warn('PostCSS', warning.toString())
}));

// '/:resouceId' always needs to be LAST since it's a catch-all route
app.use('/:resourceId', (req, _res, next) => (req.resourceId = req.params.resourceId, next()), ROUTERS.resource); // skipcq: JS-0086, JS-0090

// Error handler
app.use((err: ErrWrap, _req: Request, res: Response) => log.error(err.message).err(err).callback(() => res.sendStatus(CODE_INTERNAL_SERVER_ERROR))); // skipcq: JS-0128

(function start() {
	if (data() == null) setTimeout(start, 100);
	else log
		.info('Users', `${Object.keys(users).length}`)
		.info('Files', `${data().size}`)
		.info('Data engine', data().name, data().type)
		.info('Frontend', ASS_FRONTEND.enabled ? ASS_FRONTEND.brand : 'disabled', `${ASS_FRONTEND.enabled ? `${getTrueHttp()}${getTrueDomain()}${ASS_FRONTEND.endpoint}` : ''}`)
		.info('Custom index', ASS_INDEX ?? 'disabled')
		.blank()
		.express()!.Host(app, port, host, () => log.success('Ready for uploads', `Storing resources ${s3enabled ? 'in S3' : useSia ? 'on Sia blockchain' : 'on disk'}`));
})();
