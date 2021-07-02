const fs = require('fs-extra');
const marked = require('marked');
const { DateTime } = require('luxon');
const { WebhookClient, MessageEmbed } = require('discord.js');
const { doUpload, processUploaded } = require('../storage');
const { maxUploadSize, resourceIdSize, gfyIdSize, resourceIdType } = require('../config.json');
const { path, saveData, log, verify, getTrueHttp, getTrueDomain, generateId, formatBytes } = require('../utils');
const { CODE_UNAUTHORIZED, CODE_PAYLOAD_TOO_LARGE } = require('../MagicNumbers.json');
const data = require('../data');
const users = require('../auth');

const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/8d339d4a2f3f54b2295e5e0ff62bd9e6.png?size=1024';
const express = require('express');
const router = express.Router();

// Index
router.get('/', (_req, res, next) =>
	fs.readFile(path('README.md'))
		.then((bytes) => bytes.toString())
		.then(marked)
		.then((d) => res.render('index', { data: d }))
		.catch(next));

// Block unauthorized requests and attempt token sanitization
router.post('/', (req, res, next) => {
	req.headers.authorization = req.headers.authorization || '';
	req.token = req.headers.authorization.replace(/[^\da-z]/gi, ''); // Strip anything that isn't a digit or ASCII letter
	!verify(req, users) ? res.sendStatus(CODE_UNAUTHORIZED) : next(); // skipcq: JS-0093
});

// Upload file
router.post('/', doUpload, processUploaded, ({ next }) => next());
router.use('/', (err, _req, res, next) => err.code && err.code === 'LIMIT_FILE_SIZE' ? res.status(CODE_PAYLOAD_TOO_LARGE).send(`Max upload size: ${maxUploadSize}MB`) : next(err)); // skipcq: JS-0229

// Process uploaded file
router.post('/', (req, res) => {
	// Load overrides
	const trueDomain = getTrueDomain(req.headers['x-ass-domain']);
	const generator = req.headers['x-ass-access'] || resourceIdType;

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
			fs.writeJsonSync(path('../auth.json'), { users }, { spaces: 4 })
		});
});

module.exports = router;
