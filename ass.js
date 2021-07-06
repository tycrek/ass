try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, useSsl, diskFilePath, isProxied } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const express = require('express');
const helmet = require('helmet');
const uploadRouter = require('./routers/upload');
const resourceRouter = require('./routers/resource');
const { path, log } = require('./utils');
const { CODE_NO_CONTENT, CODE_INTERNAL_SERVER_ERROR } = require('./MagicNumbers.json');
//#endregion

// Set up premium frontend
const FRONTEND_NAME = 'ass-x'; // <-- Change this to use a custom frontend
const ASS_PREMIUM = fs.existsSync(`./${FRONTEND_NAME}/package.json`) ? (require('submodule'), require(`./${FRONTEND_NAME}`)) : { enabled: false };
log(`Frontend: ${ASS_PREMIUM.enabled ? ASS_PREMIUM.brand : '<none>'}`);

//#region Variables, module setup
const app = express();
const ROUTERS = {
	upload: uploadRouter,
	resource: resourceRouter
};

// Read users and data
const users = require('./auth');
const data = require('./data');
log('Users & data read from filesystem');
//#endregion

// Create thumbnails directory
fs.ensureDirSync(path(diskFilePath, 'thumbnails'));

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', isProxied);
app.set('view engine', 'pug');

// Helmet security middleware
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.xssFilter());
app.use(helmet.referrerPolicy());
app.use(helmet.dnsPrefetchControl());
useSsl && app.use(helmet.hsts({ preload: true })); // skipcq: JS-0093

// Don't process favicon requests (custom middleware)
app.use((req, res, next) => (req.url.includes('favicon.ico') ? res.sendStatus(CODE_NO_CONTENT) : next()));

// Assign routers ('/:resouceId' always needs to be LAST since it's a catch-all route)
app.use('/', ROUTERS.upload);
ASS_PREMIUM.enabled && app.use(ASS_PREMIUM.endpoint, ASS_PREMIUM.router); // skipcq: JS-0093
app.use('/:resourceId', (req, _, next) => (req.resourceId = req.params.resourceId, next()), ROUTERS.resource); // skipcq: JS-0086, JS-0090

// Error handler
app.use(([err, , res,]) => {
	console.error(err);
	res.sendStatus(CODE_INTERNAL_SERVER_ERROR);
});

// Host the server
app.listen(port, host, () => log(`Server started on [${host}:${port}]\nAuthorized users: ${Object.keys(users).length}\nAvailable files: ${data.size}`));
