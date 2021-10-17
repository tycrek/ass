import { AssRequest, AssResponse, ErrWrap } from './definitions';

let doSetup = null;
try {
	// Check if config.json exists
	require('../config.json');
} catch (err) {
	doSetup = require('./setup').doSetup;
}

// Run first time setup if using Docker (pseudo-process, setup will be run with docker exec)
if (doSetup) {
	doSetup();
	// @ts-ignore
	return;
}

// Load the config
const { host, port, useSsl, isProxied, s3enabled, frontendName, indexFile, useSia } = require('../config.json');

//#region Imports
import fs from 'fs-extra';
import express from 'express';
const nofavicon = require('@tycrek/express-nofavicon');
import helmet from 'helmet';
import marked from 'marked';
import uploadRouter from './routers/upload';
import resourceRouter from './routers/resource';
import { path, log, getTrueHttp, getTrueDomain } from './utils';
const { CODE_INTERNAL_SERVER_ERROR } = require('../MagicNumbers.json');
const { name: ASS_NAME, version: ASS_VERSION } = require('../package.json');
//#endregion

// Welcome :D
log.blank().info(`* ${ASS_NAME} v${ASS_VERSION} *`).blank();

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

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', isProxied);
app.set('view engine', 'pug');

// Express logger middleware
app.use(log.express(true));

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
const ASS_INDEX = indexFile !== '' && fs.existsSync(path('share', indexFile)) && require(`../share/${indexFile}`);
const ASS_INDEX_ENABLED = typeof ASS_INDEX === typeof Function;
app.get('/', (req, res, next) => ASS_INDEX_ENABLED // skipcq: JS-0229
	? ASS_INDEX(req, res, next)
	: fs.readFile(path('.github', 'README.md'))
		.then((bytes) => bytes.toString())
		.then((data) => marked(data))
		.then((d) => res.render('index', { data: d }))
		.catch(next));

// Set up custom frontend
const ASS_FRONTEND = fs.existsSync(path(`./${frontendName}/package.json`)) ? (require('submodule'), require(`../${frontendName}`)) : { enabled: false };
ASS_FRONTEND.enabled && app.use(ASS_FRONTEND.endpoint, ASS_FRONTEND.router); // skipcq: JS-0093

// Upload router (has to come after custom frontends as express-busboy interferes with all POST calls)
app.use('/', ROUTERS.upload);

// '/:resouceId' always needs to be LAST since it's a catch-all route
app.use('/:resourceId', (req: AssRequest, _res, next) => (req.resourceId = req.params.resourceId, next()), ROUTERS.resource); // skipcq: JS-0086, JS-0090

// Error handler
app.use((err: ErrWrap, _req: AssRequest, res: AssResponse, _next: Function) => log.error(err).err(err).callback(() => res.sendStatus(CODE_INTERNAL_SERVER_ERROR))); // skipcq: JS-0128

// Host the server
log
	.info('Users', `${Object.keys(users).length}`)
	.info('Files', `${data.size}`)
	.info('Data engine', data.name, data.type)
	.info('Frontend', ASS_FRONTEND.enabled ? ASS_FRONTEND.brand : 'disabled', `${ASS_FRONTEND.enabled ? `${getTrueHttp()}${getTrueDomain()}${ASS_FRONTEND.endpoint}` : ''}`)
	.info('Custom index', ASS_INDEX_ENABLED ? `enabled` : 'disabled')
	.blank()
	.express().Host(app, port, host, () => log.success('Ready for uploads', `Storing resources ${s3enabled ? 'in S3' : useSia ? 'on Sia blockchain' : 'on disk'}`));
