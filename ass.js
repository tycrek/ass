try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, domain, useSsl, resourceIdSize } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const uuid = require('uuid').v4;
const express = require('express');
const useragent = require('express-useragent');
const multer = require('multer');
const zws = require('./idgen/zws');
const { path, saveData, log, verify } = require('./utils');
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
		tokens.push(uuid().replace(/-/g, ''));
		fs.writeJsonSync(path('auth.json'), { tokens }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${tokens[0]}\n`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('auth.json')).tokens;
	data = fs.readJsonSync(path('data.json'));
	log('Tokens & data read from filesystem');
}

function startup() {
	app.use(useragent.express());

	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		if (!verify(req, tokens)) return res.sendStatus(401);

		log(`Uploaded: ${req.file.originalname} (${req.file.mimetype})`);

		// Save the file information
		let resourceId = zws(resourceIdSize); //todo: use crypto-random-string for alternative resourceId
		data[resourceId] = req.file;
		saveData(data);

		let http = ('http').concat(useSsl ? 's' : '').concat('://');
		let trueDomain = domain.concat((port != 80 || port != 443) ? `:${port}` : '');
		res.type('json').send({
			resource: `${http}${trueDomain}/${resourceId}`,
			delete: `${http}${trueDomain}/delete/${req.file.filename}`
		});
	});

	// View file
	app.get('/:resourceId', (req, res) => {
		let resourceId = req.params.resourceId.split('.')[0];
		let fileData = fs.readFileSync(path(data[resourceId].path));

		if (data[resourceId])
			res.header('Accept-Ranges', 'bytes').header('Content-Length', fileData.byteLength).type(data[resourceId].mimetype).send(fileData);
		else
			res.sendStatus(404);
	});

	// Delete file
	app.get('/delete/:filename', (req, res) => {
		let filename = req.params.filename;
		let resourceId = Object.keys(data)[Object.values(data).indexOf(Object.values(data).find((d) => d.filename == filename))];

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
