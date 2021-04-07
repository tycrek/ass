try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, domain, useSsl, resourceIdSize, resourceIdType, isProxied } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const express = require('express');
const useragent = require('express-useragent');
const multer = require('multer');
const { path, saveData, log, verify, generateToken, generateId } = require('./utils');
//#endregion

//#region Variables, module setup
const app = express();
const upload = multer({ dest: 'uploads/' });
var tokens = [];
var data = {};
//#endregion

preStartup();
startup();

function preStartup() {
	// Make sure data.json exists
	if (!fs.existsSync(path('data.json'))) {
		fs.writeJsonSync(path('data.json'), data, { spaces: 4 });
		log('File [data.json] created');
	} else log('File [data.json] exists');

	// Make sure auth.json exists and generate the first key
	if (!fs.existsSync(path('auth.json'))) {
		tokens.push(generateToken());
		fs.writeJsonSync(path('auth.json'), { tokens }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${tokens[0]}\n`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('auth.json')).tokens;
	data = fs.readJsonSync(path('data.json'));
	log('Tokens & data read from filesystem');

	// Monitor auth.json for changes (triggered by running 'npm run new-token')
	fs.watch(path('auth.json'), { persistent: false }, (eventType, _filename) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json) => (tokens.toString() != json.tokens.toString()) && (tokens = json.tokens) && log(`New token added: ${tokens[tokens.length - 1]}`))
		.catch(console.error));
}

function startup() {
	app.use(useragent.express());

	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		// Prevent uploads from unauthorized clients
		if (!verify(req, tokens)) return res.sendStatus(401);

		log(`Uploaded: ${req.file.originalname} (${req.file.mimetype})`);

		// Save the file information
		let resourceId = generateId(resourceIdType, resourceIdSize, req.file.originalname);
		data[resourceId.split('.')[0]] = req.file;
		saveData(data);

		// Send the response
		res.type('json').send({
			resource: `${getTrueHttp()}${getTrueDomain()}/${resourceId}`,
			delete: `${getTrueHttp()}${getTrueDomain()}/delete/${req.file.filename}`
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

		// If a Discord client wants to load an mp4, send the data needed for a proper inline embed
		if (req.useragent.isBot && data[resourceId].mimetype == 'video/mp4') return res.type('html').send(genHtml(resourceId));

		// Read the file and send it to the client
		fs.readFile(path(data[resourceId].path))
			.then((fileData) => res
				.header('Accept-Ranges', 'bytes')
				.header('Content-Length', fileData.byteLength)
				.type(data[resourceId].mimetype).send(fileData))
			.catch(console.error);
	});

	// Delete file
	app.get('/delete/:filename', (req, res) => {
		let filename = req.params.filename;
		let resourceId = Object.keys(data)[Object.values(data).indexOf(Object.values(data).find((d) => d.filename == filename))];

		// If the ID is invalid, return 400 because we are unable to process the resource
		if (!resourceId || !data[resourceId]) return res.sendStatus(400);

		log(`Deleted: ${data[resourceId].originalname} (${data[resourceId].mimetype})`);

		// Save the file information
		fs.rmSync(path(data[resourceId].path));
		delete data[resourceId];
		saveData(data);

		res.type('text').send('File has been deleted!');
	})

	app.listen(port, host, () => log(`Server started on [${host}:${port}]\nAuthorized tokens: ${tokens.length}\nAvailable files: ${Object.keys(data).length}`));
}

function getTrueHttp() {
	return ('http').concat(useSsl ? 's' : '').concat('://');
}
function getTrueDomain() {
	return domain.concat((port == 80 || port == 443 || isProxied) ? '' : `:${port}`);
}

function genHtml(resourceId) {
	return `
<html>
  <head>
    <title>ass</title>
	<meta property="og:type" content="video.other">
	<meta property="og:video" content="${getTrueHttp()}${getTrueDomain()}/${resourceId}.mp4">
  </head>
  <body>ass</body>
</html>
`;
}
