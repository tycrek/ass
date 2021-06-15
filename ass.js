try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, domain, useSsl, resourceIdSize, gfyIdSize, resourceIdType, isProxied, diskFilePath, saveWithDate, saveAsOriginal } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const express = require('express');
const useragent = require('express-useragent');
const rateLimit = require("express-rate-limit");
const marked = require('marked');
const multer = require('multer');
const DateTime = require('luxon').DateTime;
const { WebhookClient, MessageEmbed } = require('discord.js');
const OpenGraph = require('./ogp');
const { path, saveData, log, verify, generateToken, generateId, formatBytes, randomHexColour } = require('./utils');
//#endregion

//#region Variables, module setup
const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/8d339d4a2f3f54b2295e5e0ff62bd9e6.png?size=1024';
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
var users = {};
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
		fs.writeJsonSync(path('auth.json'), { tokens, users }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${tokens[0]}\n`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('auth.json')).tokens;
	users = fs.readJsonSync(path('auth.json')).users || {};
	data = fs.readJsonSync(path('data.json'));
	log('Tokens & data read from filesystem');

	// Monitor auth.json for changes (triggered by running 'npm run new-token')
	fs.watch(path('auth.json'), { persistent: false }, (eventType, _filename) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json) => (tokens.toString() != json.tokens.toString()) && (tokens = json.tokens) && (users = json.users) && log(`New token added: ${tokens[tokens.length - 1]}`))
		.catch(console.error));
}

function startup() {
	app.enable('case sensitive routing');
	app.set('trust proxy', isProxied);
	app.set('view engine', 'pug');
	app.use(useragent.express());

	// Don't process favicon requests
	app.use((req, res, next) => req.url.includes('favicon.ico') ? res.sendStatus(204) : next());

	// Middleware for parsing the resource ID and handling 404
	app.use('/:resourceId', (req, res, next) => {
		// Parse the resource ID
		req.ass = { resourceId: req.params.resourceId.split('.')[0] };

		// If the ID is invalid, return 404. Otherwise, continue normally
		(!req.ass.resourceId || !data[req.ass.resourceId]) ? res.sendStatus(404) : next();
	});

	// Index
	app.get('/', (_req, res) => fs.readFile(path('README.md')).then((bytes) => bytes.toString()).then(marked).then((data) => res.render('index', { data })));

	// Rate limit
	app.post('/', rateLimit({
		windowMs: 1000 * 60, // 60 seconds
		max: 30 // Limit each IP to 30 requests per windowMs
	}));

	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		// Prevent uploads from unauthorized clients
		if (!verify(req, tokens)) return res.sendStatus(401);

		// Load overrides
		let trueDomain = getTrueDomain(req.headers["x-ass-domain"]);
		let generator = req.headers["x-ass-access"] || resourceIdType;

		// Get the uploaded time in milliseconds
		req.file.timestamp = DateTime.now().toMillis();

		// Keep track of the token that uploaded the resource
		let uploadToken = req.headers.authorization;
		req.file.token = uploadToken;

		// Attach any embed overrides, if necessary
		req.file.opengraph = {
			title: req.headers['x-ass-og-title'],
			description: req.headers['x-ass-og-description'],
			author: req.headers['x-ass-og-author'],
			authorUrl: req.headers['x-ass-og-author-url'],
			provider: req.headers['x-ass-og-provider'],
			providerUrl: req.headers['x-ass-og-provider-url'],
			color: req.headers['x-ass-og-color']
		};

		// Save the file information
		let resourceId = generateId(generator, resourceIdSize, req.headers['x-ass-gfycat'] || gfyIdSize, req.file.originalname);
		data[resourceId.split('.')[0]] = req.file;
		saveData(data);

		// Log the upload
		let logInfo = `${req.file.originalname} (${req.file.mimetype})`;
		log(`Uploaded: ${logInfo} (user: ${users[uploadToken] ? users[uploadToken].username : '<token-only>'})`);

		// Build the URLs
		let resourceUrl = `${getTrueHttp()}${trueDomain}/${resourceId}`;
		let deleteUrl = `${getTrueHttp()}${trueDomain}/delete/${req.file.filename}`;

		// Send the response
		res.type('json').send({ resource: resourceUrl, delete: deleteUrl })
			.on('finish', () => {

				// After we have sent the user the response, also send a Webhook to Discord (if headers are present)
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
						avatarURL: req.headers['x-ass-webhook-avatar'] || ASS_LOGO,
						embeds: [embed]
					}).then((_msg) => whc.destroy());
				}

				// Also update the users upload count
				if (!users[uploadToken]) {
					let generator = () => generateId('random', 20, null);
					let username = generator();
					while (Object.values(users).findIndex((user) => user.username == username) != -1)
						username = generator();
					users[uploadToken] = { username, count: 0 };
				}
				users[uploadToken].count += 1;
				fs.writeJsonSync(path('auth.json'), { tokens, users }, { spaces: 4 })
			});
	});

	// View file
	app.get('/:resourceId', (req, res) => {
		let resourceId = req.ass.resourceId;

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

	// oEmbed response for clickable authors/providers
	// https://oembed.com/
	// https://old.reddit.com/r/discordapp/comments/82p8i6/a_basic_tutorial_on_how_to_get_the_most_out_of/
	app.get('/:resourceId/oembed.json', (req, res) => {
		let resourceId = req.ass.resourceId;

		// Build the oEmbed object & send the response
		let { opengraph, mimetype } = data[resourceId];
		res.type('json').send({
			version: '1.0',
			type: mimetype.includes('video') ? 'video' : 'photo',
			author_name: opengraph.author,
			author_url: opengraph.authorUrl,
			provider_name: opengraph.provider,
			provider_url: opengraph.providerUrl
		});
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
