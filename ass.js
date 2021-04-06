require('dotenv').config();
const fs = require('fs-extra');
const uuid = require('uuid').v4;
const express = require('express');
const multer = require('multer');
const zws = require('./zws');
const { path, saveData, log, verify } = require('./utils');

//#region Variables, module setup
const app = express();
const upload = multer({ dest: 'uploads/' });
const resourceIdSize = 8;
var tokens = [];
var data = {};

preStartup();
startup();

function preStartup() {
	// Make sure .env exists
	if (!fs.existsSync(path('.env'))) {
		fs.copyFileSync(path('.env.example'), path('.env'));
		log('File [.env] created');
		require('dotenv').config();
	} else log('File [.env] exists');

	// Make sure data.json exists
	if (!fs.existsSync(path('data.json'))) {
		fs.writeJsonSync(path('data.json'), data, { spaces: 4 });
		log('File [data.json] created');
	} else log('File [data.json] exists');

	// Make sure auth.json exists and generate the first key
	if (!fs.existsSync(path('auth.json'))) {
		tokens.push(uuid().replace(/-/g, ''));
		fs.writeJsonSync(path('auth.json'), { tokens }, { spaces: 4 });
		log('File [auth.json] created');

		log(`\n!! Important: save this token in a secure spot: ${tokens[0]}`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('auth.json')).tokens;
	data = fs.readJsonSync(path('data.json'));
	log('Tokens & data read from filesystem');
}

function startup() {
	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		if (!verify(req, tokens)) return res.sendStatus(401);

		log(`Uploaded: ${req.file.originalname} (${req.file.mimetype})`);

		// Save the file information
		let resourceId = zws(resourceIdSize); //todo: use crypto-random-string for alternative resourceId
		data[resourceId] = req.file;
		saveData(data);

		res.type('json').send({ resource: `https://${process.env.DOMAIN}/${resourceId}`, delete: `https://${process.env.DOMAIN}/delete/${req.file.filename}` });
	});

	// View file
	app.get('/:resourceId', (req, res) => {
		let resourceId = req.params.resourceId;
		if (data[resourceId]) res.type(data[resourceId].mimetype).send(fs.readFileSync(path(data[resourceId].path)));// .sendFile(path(data[resourceId].path));
		else res.sendStatus(404);
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

	app.listen(process.env.PORT, () => log(`Server started on port ${process.env.PORT}\nAuthorized tokens: ${tokens.length}\nAvailable files: ${Object.keys(data).length}`));
}