try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, domain, useSsl, resourceIdSize, resourceIdType, isProxied, diskFilePath, saveWithDate, saveAsOriginal } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const express = require('express');
const useragent = require('express-useragent');
const multer = require('multer');
const DateTime = require('luxon').DateTime;
const { WebhookClient, MessageEmbed } = require('discord.js');
const OpenGraph = require('./ogp');
const { path, saveData, log, verify, generateToken, generateId, formatBytes, randomHexColour } = require('./utils');
//#endregion

//#region Variables, module setup
const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/3437bfa0b32103d91e294d794ad1205d.png?size=1024'; // todo: change this to the logo eventually
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

		// Load overrides
		let trueDomain = getTrueDomain(req.headers["x-ass-domain"]);
		let generator = req.headers["x-ass-access"] || resourceIdType;

		// Get the uploaded time in milliseconds
		req.file.timestamp = DateTime.now().toMillis();

		// Attach any embed overrides, if necessary
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

		// Log the upload
		let logInfo = `${req.file.originalname} (${req.file.mimetype})`;
		log(`Uploaded: ${logInfo}`);

		// Build the URLs
		let resourceUrl = `${getTrueHttp()}${trueDomain}/${resourceId}`;
		let deleteUrl = `${getTrueHttp()}${trueDomain}/delete/${req.file.filename}`;

		// Send the response
		res.type('json').send({ resource: resourceUrl, delete: deleteUrl })

			// After we have sent the user the response, also send a Webhook to Discord (if headers are present)
			.on('finish', () => {
				if (req.headers['x-ass-webhook-client'] && req.headers['x-ass-webhook-token']) {

					// Build the webhook client & embed
					let whc = new WebhookClient(req.headers['x-ass-webhook-client'], req.headers['x-ass-webhook-token']);
					let embed = new MessageEmbed()
						.setTitle(logInfo)
						.setDescription(`**Size:** \`${formatBytes(req.file.size)}\`\n**[Delete](${deleteUrl})**`)
						.setThumbnail(resourceUrl)
						.setColor(randomHexColour())
						.setTimestamp(req.file.timestamp);

					// Send the embed to the webhook, then delete the client after to free resources
					whc.send(null, {
						username: req.headers['x-ass-webhook-username'] || 'ass',
						avatarURL: ASS_LOGO,
						embeds: [embed]
					}).then((_msg) => whc.destroy());
				}
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

function getTrueDomain(d = domain) {
	return d.concat((port == 80 || port == 443 || isProxied) ? '' : `:${port}`);
}
