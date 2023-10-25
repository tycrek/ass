import { ErrWrap } from './types/definitions';
import { Config, MagicNumbers, Package } from 'ass-json';

//#region Imports
import fs from 'fs-extra';
import express, { Request, Response, json as BodyParserJson } from 'express';
import { nofavicon } from '@tycrek/joint';
import { epcss } from '@tycrek/express-postcss';
import tailwindcss from 'tailwindcss';
import helmet from 'helmet';

import { path, log, getTrueHttp, getTrueDomain } from './utils';
import { onStart as ApiOnStart } from './routers/api';
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
const { host, port, useSsl, isProxied, s3enabled, frontendName, diskFilePath }: Config = fs.readJsonSync(path('config.json'));
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
import { onStart as AuthOnStart, users } from './auth';
import { onStart as DataOnStart, data } from './data';
//#endregion

// Create thumbnails directory
fs.ensureDirSync(path(diskFilePath, 'thumbnails'));

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', isProxied);
app.set('view engine', 'pug');

// Express logger middleware
// app.use(log.middleware());

// Body parser for API POST requests
// (I really don't like this being top level but it does not work inside the API Router as of 2022-12-24)
app.use(BodyParserJson());

// Helmet security middleware
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.xssFilter());
app.use(helmet.referrerPolicy());
app.use(helmet.dnsPrefetchControl());
useSsl && app.use(helmet.hsts({ preload: true })); // skipcq: JS-0093

// Don't process favicon requests
// todo: this doesn't actually return a 204 properly, it returns a 404
app.use(nofavicon.none());

// Use custom index, otherwise render README.md
type ASS_INDEX_TYPE = 'html' | 'js' | undefined;
const ASS_INDEX: ASS_INDEX_TYPE = fs.existsSync(path('share', 'index.html')) ? 'html' : fs.existsSync(path('share', 'index.js')) ? 'js' : undefined;
app.get('/', (req, res, next) =>
	ASS_INDEX === 'html' ? res.sendFile(path('share', 'index.html')) :
		ASS_INDEX === 'js' ? require(path('share', 'index.js'))(req, res, next) : // skipcq: JS-0359
			res.redirect(homepage))

// Set up custom frontend
const ASS_FRONTEND = { enabled: false }; // ! Disabled in 0.14.7

// Upload router (has to come after custom frontends as express-busboy interferes with all POST calls)
app.use('/', ROUTERS.upload);

// API
app.use('/api', ApiOnStart());

// CSS
app.use('/css', epcss({
	cssPath: path('tailwind.css'),
	plugins: [
		tailwindcss,
		require('autoprefixer')(),
		require('cssnano')(),
		require('@tinycreek/postcss-font-magician')(),
	],
	warn: (warning: Error) => log.warn('PostCSS', warning.toString())
}));

// '/:resouceId' always needs to be LAST since it's a catch-all route
app.use('/:resourceId', (req, _res, next) => (req.resourceId = req.params.resourceId, next()), ROUTERS.resource); // skipcq: JS-0086, JS-0090

// Error handler
app.use((err: ErrWrap, _req: Request, res: Response) => {
	log.error(err.message);
	console.error(err);
	res.sendStatus(CODE_INTERNAL_SERVER_ERROR);
});

(async function start() {
	await AuthOnStart();
	await DataOnStart();

	if (data() == null) setTimeout(start, 100);
	else log
		.info('Users', `${users.length}`)
		.info('Files', `${data().size}`)
		.info('Data engine', data().name, data().type)
		.info('Frontend', 'disabled')
		.info('Custom index', ASS_INDEX ?? 'disabled')
		.blank()
		.callback(() => app.listen(port, host, () => log.success('Ready for uploads', `Storing resources ${s3enabled ? 'in S3' : 'on disk'}`)));
})();
