try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, resourceIdSize, diskFilePath, gfyIdSize, resourceIdType, isProxied, s3enabled, saveAsOriginal } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const express = require('express');
const escape = require('escape-html');
const useragent = require('express-useragent');
const rateLimit = require("express-rate-limit");
const fetch = require('node-fetch');
const marked = require('marked');
const { DateTime } = require('luxon');
const { WebhookClient, MessageEmbed } = require('discord.js');
const OpenGraph = require('./ogp');
const Thumbnail = require('./thumbnails');
const Vibrant = require('./vibrant');
const Hash = require('./hash');
const { uploadLocal, uploadS3, deleteS3 } = require('./storage');
const { path, saveData, log, verify, getTrueHttp, getTrueDomain, renameFile, generateToken, generateId, formatBytes, arrayEquals, getS3url, downloadTempS3, sanitize } = require('./utils');
const { CODE_NO_CONTENT, CODE_BAD_REQUEST, CODE_UNAUTHORIZED, CODE_NOT_FOUND } = require('./MagicNumbers.json');
//#endregion

//#region Variables, module setup
const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/8d339d4a2f3f54b2295e5e0ff62bd9e6.png?size=1024';
const app = express();

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
	users = fs.readJsonSync(path('auth.json')).users || {};
	data = fs.readJsonSync(path('data.json'));
	log('Users & data read from filesystem');

	// Monitor auth.json for changes (triggered by running 'npm run new-token')
	fs.watch(path('auth.json'), { persistent: false }, (eventType) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json) => !(arrayEquals(Object.keys(users), Object.keys(json.users))) && (users = json.users) && log(`New token added: ${Object.keys(users)[Object.keys(users).length - 1]}`)) // skipcq: JS-0243
		.catch(console.error));

	// Create thumbnails directory
	fs.ensureDirSync(path(diskFilePath, 'thumbnails'));
}

/**
 * Builds the router
 * ///todo: make this separate
 */
function startup() {
	app.enable('case sensitive routing');
	app.set('trust proxy', isProxied);
	app.set('view engine', 'pug');
	app.use(useragent.express());

	// Rate limit
	app.use(rateLimit({
		windowMs: 1000 * 60, // 60 seconds // skipcq: JS-0074
		max: 90 // Limit each IP to 30 requests per windowMs // skipcq: JS-0074
	}));

	// Don't process favicon requests
	app.use((req, res, next) => (req.url.includes('favicon.ico') ? res.sendStatus(CODE_NO_CONTENT) : next()));

	// Index
	app.get('/', (_req, res) => fs.readFile(path('README.md')).then((bytes) => bytes.toString()).then(marked).then((d) => res.render('index', { data: d })));

	// Block unauthorized requests and attempt token sanitization
	app.post('/', (req, res, next) => {
		req.token = req.headers.authorization.replace(/[^\da-z]/gi, '');
		!verify(req, users) ? res.sendStatus(CODE_UNAUTHORIZED) : next(); // skipcq: JS-0093
	});

	// Generate ID's to use for other functions
	app.post('/', (req, _res, next) => (req.randomId = generateId('random', 32, null, null), next())); // skipcq: JS-0074, JS-0086, JS-0090
	app.post('/', (req, _res, next) => (req.deleteId = generateId('random', 32, null, null), next())); // skipcq: JS-0074, JS-0086, JS-0090

	// Upload file (local & S3) // skipcq: JS-0093
	s3enabled
		? app.post('/', (req, res, next) => uploadS3(req, res, (error) => ((error) && console.error(error), next())))  // skipcq: JS-0090
		: app.post('/', uploadLocal, ({ next }) => next());

	// Pre-response operations
	app.post('/', (req, _res, next) => {
		req.file.randomId = req.randomId;
		req.file.deleteId = req.deleteId;

		// Sanitize filename just in case Multer didn't catch it
		req.file.originalname = sanitize(req.file.originalname);

		// Download a temp copy to work with if using S3 storage
		(s3enabled ? downloadTempS3(req.file) : new Promise((resolve) => resolve()))

			// Generate the Thumbnail, Vibrant, and SHA1 hash
			.then(() => Promise.all([Thumbnail(req.file), Vibrant(req.file), Hash(req.file)]))
			// skipcq: JS-0086
			.then(([thumbnail, vibrant, sha1]) => (
				req.file.thumbnail = thumbnail,// skipcq: JS-0090
				req.file.vibrant = vibrant,// skipcq: JS-0090
				req.file.sha1 = sha1// skipcq: JS-0090
			))

			// Remove the temp file if using S3 storage, otherwise rename the local file
			.then(() => (s3enabled ? fs.remove(path(diskFilePath, req.file.originalname)) : renameFile(req, saveAsOriginal ? req.file.originalname : req.file.sha1)))
			.then(() => next())
			.catch((err) => next(err));
	});

	// Process uploaded file
	app.post('/', (req, res) => {
		// Load overrides
		const trueDomain = getTrueDomain(req.headers["x-ass-domain"]);
		const generator = req.headers["x-ass-access"] || resourceIdType;

		// Get the uploaded time in milliseconds
		req.file.timestamp = DateTime.now().toMillis();

		// Keep track of the token that uploaded the resource
		req.file.token = req.token;

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
		const resourceId = generateId(generator, resourceIdSize, req.headers['x-ass-gfycat'] || gfyIdSize, req.file.originalname);
		data[resourceId.split('.')[0]] = req.file;
		saveData(data);

		// Log the upload
		const logInfo = `${req.file.originalname} (${req.file.mimetype})`;
		log(`Uploaded: ${logInfo} (user: ${users[req.token] ? users[req.token].username : '<token-only>'})`);

		// Build the URLs
		const resourceUrl = `${getTrueHttp()}${trueDomain}/${resourceId}`;
		const thumbnailUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/thumbnail`;
		const deleteUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/delete/${req.file.deleteId}`;

		// Send the response
		res.type('json').send({ resource: resourceUrl, thumbnail: thumbnailUrl, delete: deleteUrl })
			.on('finish', () => {

				// After we have sent the user the response, also send a Webhook to Discord (if headers are present)
				if (req.headers['x-ass-webhook-client'] && req.headers['x-ass-webhook-token']) {

					// Build the webhook client & embed
					const whc = new WebhookClient(req.headers['x-ass-webhook-client'], req.headers['x-ass-webhook-token']);
					const embed = new MessageEmbed()
						.setTitle(logInfo)
						.setURL(resourceUrl)
						.setDescription(`**Size:** \`${formatBytes(req.file.size)}\`\n**[Delete](${deleteUrl})**`)
						.setThumbnail(thumbnailUrl)
						.setColor(req.file.vibrant)
						.setTimestamp(req.file.timestamp);

					// Send the embed to the webhook, then delete the client after to free resources
					whc.send(null, {
						username: req.headers['x-ass-webhook-username'] || 'ass',
						avatarURL: req.headers['x-ass-webhook-avatar'] || ASS_LOGO,
						embeds: [embed]
					}).then(() => whc.destroy());
				}

				// Also update the users upload count
				if (!users[req.token]) {
					const generateUsername = () => generateId('random', 20, null); // skipcq: JS-0074
					let username = generateUsername();
					while (Object.values(users).findIndex((user) => user.username === username) !== -1)  // skipcq: JS-0073
						username = generateUsername();
					users[req.token] = { username, count: 0 };
				}
				users[req.token].count += 1;
				fs.writeJsonSync(path('auth.json'), { users }, { spaces: 4 })
			});
	});

	// Middleware for parsing the resource ID and handling 404
	app.use('/:resourceId', (req, res, next) => {
		// Parse the resource ID
		req.ass = { resourceId: escape(req.params.resourceId).split('.')[0] };

		// If the ID is invalid, return 404. Otherwise, continue normally // skipcq: JS-0093
		(!req.ass.resourceId || !data[req.ass.resourceId]) ? res.sendStatus(CODE_NOT_FOUND) : next();
	});

	// View file
	app.get('/:resourceId', (req, res) => {
		const { resourceId } = req.ass;
		const fileData = data[resourceId];

		const requiredItems = {
			randomId: fileData.randomId,
			originalname: escape(fileData.originalname),
			mimetype: fileData.mimetype,
			size: fileData.size,
			timestamp: fileData.timestamp,
			opengraph: fileData.opengraph,
			vibrant: fileData.vibrant,
		};

		// If the client is Discord, send an Open Graph embed
		if (req.useragent.isBot) return res.type('html').send(new OpenGraph(getTrueHttp(), getTrueDomain(), resourceId, requiredItems).build());

		// Return the file differently depending on what storage option was used
		const uploaders = {
			s3: () => fetch(getS3url(fileData.randomId, fileData.mimetype)).then((file) => {
				file.headers.forEach((value, header) => res.setHeader(header, value));
				file.body.pipe(res);
			}),
			local: () => {
				res.header('Accept-Ranges', 'bytes').header('Content-Length', fileData.size).type(fileData.mimetype);
				fs.createReadStream(path(fileData.path)).pipe(res);
			}
		};

		uploaders[s3enabled ? 's3' : 'local']();
	});

	// Thumbnail response
	app.get('/:resourceId/thumbnail', (req, res) => {
		const { resourceId } = req.ass;

		// Read the file and send it to the client
		fs.readFile(path(diskFilePath, 'thumbnails/', data[resourceId].thumbnail))
			.then((fileData) => res.type('jpg').send(fileData))
			.catch(console.error);
	});

	// oEmbed response for clickable authors/providers
	// https://oembed.com/
	// https://old.reddit.com/r/discordapp/comments/82p8i6/a_basic_tutorial_on_how_to_get_the_most_out_of/
	app.get('/:resourceId/oembed.json', (req, res) => {
		const { resourceId } = req.ass;

		// Build the oEmbed object & send the response
		const { opengraph, mimetype } = data[resourceId];
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
	app.get('/:resourceId/delete/:deleteId', (req, res) => {
		const { resourceId } = req.ass;
		const deleteId = escape(req.params.deleteId);
		const fileData = data[resourceId];

		// If the delete ID doesn't match, don't delete the file
		if (deleteId !== fileData.deleteId) return res.sendStatus(CODE_UNAUTHORIZED);

		// If the ID is invalid, return 400 because we are unable to process the resource
		if (!resourceId || !fileData) return res.sendStatus(CODE_BAD_REQUEST);

		log(`Deleted: ${fileData.originalname} (${fileData.mimetype})`);

		// Save the file information
		Promise.all([s3enabled ? deleteS3(fileData) : fs.rmSync(path(fileData.path)), fs.rmSync(path(diskFilePath, 'thumbnails/', fileData.thumbnail))])
			.then(() => {
				delete data[resourceId];
				saveData(data);
				res.type('text').send('File has been deleted!');
			})
			.catch(console.error);
	});

	// Host the server
	app.listen(port, host, () => log(`Server started on [${host}:${port}]\nAuthorized users: ${Object.keys(users).length}\nAvailable files: ${Object.keys(data).length}`));
}

preStartup();
startup();
