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
const rateLimit = require('express-rate-limit');
const uploadRouter = require('./routers/upload');
const resourceRouter = require('./routers/resource');
const { path, log, generateToken } = require('./utils');
const { CODE_NO_CONTENT, CODE_INTERNAL_SERVER_ERROR } = require('./MagicNumbers.json');
//#endregion

// Set up ass-x
const ASS_PREMIUM = fs.existsSync('./ass-x/package.json') ? require('./ass-x') : { enabled: false };

//#region Variables, module setup
const app = express();
const ROUTERS = {
	upload: uploadRouter,
	resource: resourceRouter
};

// Configure filename and location settings
let users = {};
let data = {};
//#endregion

/**
 * Operations to run to ensure ass can start properly
 */
function preStartup() {
	// Make sure data.json exists
	if (!fs.existsSync(path('data.json'))) {
		fs.writeJsonSync(path('data.json'), data, { spaces: 4 });
		log('File [data.json] created');
	} else log('File [data.json] exists');

	// Make sure auth.json exists and generate the first key
	if (!fs.existsSync(path('auth.json'))) {
		const token = generateToken();
		users[token] = { username: 'ass', count: 0 };
		fs.writeJsonSync(path('auth.json'), { users }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${Object.keys(users)[0]}\n`);
	} else log('File [auth.json] exists');

	// Read users and data
	users = require('./auth');
	data = require('./data');
	log('Users & data read from filesystem');

	// Create thumbnails directory
	fs.ensureDirSync(path(diskFilePath, 'thumbnails'));

	// Print front-end operating mode
	log(`Frontend: ${ASS_PREMIUM.enabled ? ASS_PREMIUM.brand : '<none>'}`)
}

/**
 * Builds the router & starts the server
 */
function startup() {
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

	// Rate limit middleware
	app.use(rateLimit({
		windowMs: 1000 * 60, // 60 seconds // skipcq: JS-0074
		max: 90 // Limit each IP to 30 requests per windowMs // skipcq: JS-0074
	}));

	// Don't process favicon requests (custom middleware)
	app.use((req, res, next) => (req.url.includes('favicon.ico') ? res.sendStatus(CODE_NO_CONTENT) : next()));

	// Assign routers ('/:resouceId' always needs to be LAST since it's a catch-all route)
	app.use('/', ROUTERS.upload);
	ASS_PREMIUM.enabled && app.use(ASS_PREMIUM.endpoint, ASS_PREMIUM.router);
	app.use('/:resourceId', (req, _, next) => (req.resourceId = req.params.resourceId, next()), ROUTERS.resource); // skipcq: JS-0086, JS-0090

	// Error handler
	app.use(([err, , res,]) => {
		console.error(err);
		res.sendStatus(CODE_INTERNAL_SERVER_ERROR);
	});

	// Host the server
	app.listen(port, host, () => log(`Server started on [${host}:${port}]\nAuthorized users: ${Object.keys(users).length}\nAvailable files: ${Object.keys(data).length}`));
}

preStartup();
startup();
