require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid').v4;
const express = require('express');
const multer = require('multer');
const zws = require('./zws');

//#region Variables?
const app = express();
const upload = multer({ dest: 'uploads/' });
const resourceIdSize = 8;
var tokens = [];
var data = {};

preStartup();
startup();

function preStartup() {
	// Make sure .env exists
	if (!fs.existsSync(path.join(__dirname, '.env'))) fs.copyFileSync(path.join(__dirname, '.env.example'), path.join(__dirname, '.env'));

	// Make sure data.json exists
	if (!fs.existsSync(path.join(__dirname, 'data.json'))) fs.writeJsonSync(path.join(__dirname, 'data.json'), data, { spaces: 4 });

	// Make sure auth.json exists and generate the first key
	if (!fs.existsSync(path.join(__dirname, 'auth.json'))) {
		tokens.push(uuid().replace(/-/g, ''));
		fs.writeJsonSync(path.join(__dirname, 'auth.json'), { tokens }, { spaces: 4 });
		console.log('!! Important: save this token in a secure spot: ' + tokens[0]);
	}

	// Read tokens and data
	tokens = fs.readJsonSync(path.join(__dirname, 'auth.json')).tokens;
	data = fs.readJsonSync(path.join(__dirname, 'data.json'));

}

function startup() {
	app.post('/', upload.single('file'), (req, res, next) => {
		if (!req.headers.authorization || !tokens.includes(req.headers.authorization)) return res.sendStatus(401);

		let resourceId = zws(resourceIdSize);
		data[resourceId] = req.file;

		res.type('text').send(`http://lh:${process.env.PORT}/${resourceId}`);
	});

	app.get('/:resourceId', (req, res) => {
		let resourceId = req.params.resourceId;
		console.log(data);
		if (data[resourceId]) res.type(data[resourceId].mimetype).sendFile(path.join(__dirname, data[resourceId].path));
	});

	app.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`));
}