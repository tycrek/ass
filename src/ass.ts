//#region Config pre-check
try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error(err)
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}
//#endregion

// Load the config
const { host, port, domain, useSsl, resourceIdSize, resourceIdType, isProxied, diskFilePath, saveWithDate, saveAsOriginal } = require('./config.json');

//#region Imports
import * as fs from 'fs-extra';
import * as express from 'express';
import * as useragent from 'express-useragent';
import * as multer from 'multer';
import { DateTime } from 'luxon';
const OpenGraph = require('./ogp');
const { path, saveData, log, verify, generateToken, generateId } = require('./utils');
//#endregion

//#region Variables, module setup
const app = express();

// Configure filename and location settings
const storage = multer.diskStorage({
	filename: saveAsOriginal ? (_req, file, callback) => callback(null, file.originalname) : null,
	destination: !saveWithDate ? diskFilePath : (_req, _file, callback) => {
		// Get current month and year
		let [month, _day, year] = new Date().toLocaleDateString("en-US").split("/");

		// Add 0 before single digit months eg ( 6 turns into 06)
		let folder = `${diskFilePath}/${year}-${("0" + month).slice(-2)}`;

		// Create folder if it doesn't exist
		fs.ensureDirSync(folder);

		callback(null, folder);
	}
});

var upload = multer({ storage });
var tokens = [];
var data = {};
//#endregion

preStartup();
startup();

function preStartup() {
	// Make sure data.json exists
	if (!fs.existsSync(path('..', 'data.json'))) {
		fs.writeJsonSync(path('..', 'data.json'), data, { spaces: 4 });
		log('File [data.json] created');
	} else log('File [data.json] exists');

	// Make sure auth.json exists and generate the first key
	if (!fs.existsSync(path('..', 'auth.json'))) {
		tokens.push(generateToken());
		fs.writeJsonSync(path('..', 'auth.json'), { tokens }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${tokens[0]}\n`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('..', 'auth.json')).tokens;
	data = fs.readJsonSync(path('..', 'data.json'));
	log('Tokens & data read from filesystem');

	// Monitor auth.json for changes (triggered by running 'npm run new-token')
	fs.watch(path('..', 'auth.json'), { persistent: false }, (eventType, _filename) => eventType === 'change' && fs.readJson(path('..', 'auth.json'))
		.then((json) => (tokens.toString() != json.tokens.toString()) && (tokens = json.tokens) && log(`New token added: ${tokens[tokens.length - 1]}`))
		.catch(console.error));
}

function startup() {
	app.use(useragent.express());

	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		// Prevent uploads from unauthorized clients
		if (!verify(req, tokens)) return res.sendStatus(401);

		// Load overrides
		let trueDomain = getTrueDomain(req.headers["x-ass-domain"]);
		let generator = req.headers["x-ass-access"] || resourceIdType;

		// Get the uploaded time in milliseconds
		// @ts-ignore // todo make this not ignored
		req.file.timestamp = DateTime.now().toMillis();

		// Attach any embed overrides, if necessary
		// @ts-ignore // todo make this not ignored
		req.file.opengraph = {
			title: req.headers['x-ass-og-title'],
			description: req.headers['x-ass-og-description'],
			author: req.headers['x-ass-og-author'],
			color: req.headers['x-ass-og-color']
		};

		// Save the file information
		let resourceId = generateId(generator, resourceIdSize, req.file.originalname);
		data[resourceId.split('.')[0]] = req.file;
		saveData(data);

		log(`Uploaded: ${req.file.originalname} (${req.file.mimetype})`);

		// Send the response
		res.type('json').send({
			resource: `${getTrueHttp()}${trueDomain}/${resourceId}`,
			delete: `${getTrueHttp()}${trueDomain}/delete/${req.file.filename}`
		});
	});

	// View file
	app.get('/:resourceId', (req, res) => {
		// Don't process favicon requests
		if (req.url.includes('favicon.ico')) return;

		// Parse the resource ID
		let resourceId = req.params.resourceId.split('.')[0];

		// If the ID is invalid, return 404
		if (!resourceId || !data[resourceId]) return res.sendStatus(404);

		// If the client is Discord, send an Open Graph embed
		if (req.useragent.isBot) return res.type('html').send(new OpenGraph(getTrueHttp(), getTrueDomain(), resourceId, data[resourceId]).build());

		// Read the file and send it to the client
		fs.readFile(path('..', data[resourceId].path))
			.then((fileData) => res
				.header('Accept-Ranges', 'bytes')
				.header('Content-Length', fileData.byteLength.toString())
				.type(data[resourceId].mimetype).send(fileData))
			.catch(console.error);
	});

	// Delete file
	app.get('/delete/:filename', (req, res) => {
		let filename = req.params.filename;
		let resourceId = Object.keys(data)[Object.values(data).indexOf(Object.values(data).find((d: any) => d.filename == filename))];

		// If the ID is invalid, return 400 because we are unable to process the resource
		if (!resourceId || !data[resourceId]) return res.sendStatus(400);

		log(`Deleted: ${data[resourceId].originalname} (${data[resourceId].mimetype})`);

		// Save the file information
		fs.rmSync(path('..', data[resourceId].path));
		delete data[resourceId];
		saveData(data);

		res.type('text').send('File has been deleted!');
	})

	app.listen(port, host, () => log(`Server started on [${host}:${port}]\nAuthorized tokens: ${tokens.length}\nAvailable files: ${Object.keys(data).length}`));
}

function getTrueHttp() {
	return ('http').concat(useSsl ? 's' : '').concat('://');
}

function getTrueDomain(d = domain) {
	return d.concat((port == 80 || port == 443 || isProxied) ? '' : `:${port}`);
}
