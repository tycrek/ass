import { FileData, AssRequest, AssResponse, ErrWrap, User } from "../definitions";

const fs = require('fs-extra');
//const rateLimit = require('express-rate-limit');
const { DateTime } = require('luxon');
const { WebhookClient, MessageEmbed } = require('discord.js');
const { doUpload, processUploaded } = require('../storage');
const { maxUploadSize, resourceIdSize, gfyIdSize, resourceIdType } = require('../../config.json');
const { path, log, verify, getTrueHttp, getTrueDomain, generateId, formatBytes } = require('../utils');
const { CODE_UNAUTHORIZED, CODE_PAYLOAD_TOO_LARGE } = require('../../MagicNumbers.json');
const data = require('../data');
const users = require('../auth');

const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/8d339d4a2f3f54b2295e5e0ff62bd9e6.png?size=1024';
import express from 'express';
const router = express.Router();

// Rate limit middleware
/* router.use('/', rateLimit({
	windowMs: 1000 * 60, // 60 seconds // skipcq: JS-0074
	max: 90 // Limit each IP to 30 requests per windowMs // skipcq: JS-0074
})); */

// Block unauthorized requests and attempt token sanitization
router.post('/', (req: AssRequest, res: AssResponse, next: Function) => {
	req.headers.authorization = req.headers.authorization || '';
	req.token = req.headers.authorization.replace(/[^\da-z]/gi, ''); // Strip anything that isn't a digit or ASCII letter
	!verify(req, users) ? log.warn('Upload blocked', 'Unauthorized').callback(() => res.sendStatus(CODE_UNAUTHORIZED)) : next(); // skipcq: JS-0093
});

// Upload file
//router.post('/', doUpload, processUploaded, ({ next }) => next());
router.post('/', (req: AssRequest, res: AssResponse, next: Function) => doUpload(req, res, (err: Error) => {
	log.express().Header(req, 'Content-Type');
	(err) ? log.error(`Multer encountered an ${!(err.toString().includes('MulterError')) ? 'unknown ' : ''}error`, err).callback(next, err) : log.debug('Multer', 'File saved in temp dir').callback(next);
}), processUploaded, ({ next }: { next: Function }) => next());

router.use('/', (err: ErrWrap, _req: AssRequest, res: AssResponse, next: Function) => err.code && err.code === 'LIMIT_FILE_SIZE' ? log.warn('Upload blocked', 'File too large').callback(() => res.status(CODE_PAYLOAD_TOO_LARGE).send(`Max upload size: ${maxUploadSize}MB`)) : next(err)); // skipcq: JS-0229

// Process uploaded file
router.post('/', (req: AssRequest, res: AssResponse, next: Function) => {
	// Load overrides
	const trueDomain = getTrueDomain(req.headers['x-ass-domain']);
	const generator = req.headers['x-ass-access'] || resourceIdType;

	// Save domain with file
	req.file!.domain = `${getTrueHttp()}${trueDomain}`;

	// Get the uploaded time in milliseconds
	req.file!.timestamp = DateTime.now().toMillis();

	// Keep track of the token that uploaded the resource
	req.file!.token = req.token ?? '';

	// Attach any embed overrides, if necessary
	req.file!.opengraph = {
		title: req.headers['x-ass-og-title'],
		description: req.headers['x-ass-og-description'],
		author: req.headers['x-ass-og-author'],
		authorUrl: req.headers['x-ass-og-author-url'],
		provider: req.headers['x-ass-og-provider'],
		providerUrl: req.headers['x-ass-og-provider-url'],
		color: req.headers['x-ass-og-color']
	};

	// Save the file information
	const resourceId = generateId(generator, resourceIdSize, req.headers['x-ass-gfycat'] || gfyIdSize, req.file!.originalname);
	log.debug('Saving data', data.name);
	data.put(resourceId.split('.')[0], req.file).then(() => {
		// Log the upload
		const logInfo = `${req.file!.originalname} (${req.file!.mimetype}, ${formatBytes(req.file!.size)})`;
		log.success('File uploaded', logInfo, `uploaded by ${users[req.token ?? ''] ? users[req.token ?? ''].username : '<token-only>'}`);

		// Build the URLs
		const resourceUrl = `${getTrueHttp()}${trueDomain}/${resourceId}`;
		const thumbnailUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/thumbnail`;
		const deleteUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/delete/${req.file!.deleteId}`;

		// Send the response
		res.type('json').send({ resource: resourceUrl, thumbnail: thumbnailUrl, delete: deleteUrl })
			.on('finish', () => {
				log.debug('Upload response sent');

				// After we have sent the user the response, also send a Webhook to Discord (if headers are present)
				if (req.headers['x-ass-webhook-client'] && req.headers['x-ass-webhook-token']) {
					const client = req.headers['x-ass-webhook-client']

					// Build the webhook client & embed
					const whc = new WebhookClient(client, req.headers['x-ass-webhook-token']);
					const embed = new MessageEmbed()
						.setTitle(logInfo)
						.setURL(resourceUrl)
						.setDescription(`**Size:** \`${formatBytes(req.file!.size)}\`\n**[Delete](${deleteUrl})**`)
						.setThumbnail(thumbnailUrl)
						.setColor(req.file!.vibrant)
						.setTimestamp(req.file!.timestamp);

					// Send the embed to the webhook, then delete the client after to free resources
					log.debug('Sending webhook to client', client);
					whc.send(null, {
						username: req.headers['x-ass-webhook-username'] || 'ass',
						avatarURL: req.headers['x-ass-webhook-avatar'] || ASS_LOGO,
						embeds: [embed]
					}).then(() => log.debug('Webhook sent').callback(() => whc.destroy()));
				}

				// Also update the users upload count
				if (!users[req.token ?? '']) {
					const generateUsername = () => generateId('random', 20, null); // skipcq: JS-0074
					let username: string = generateUsername();

					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					while (Object.values(users).findIndex((user: User) => user.username === username) !== -1)  // skipcq: JS-0073
						username = generateUsername();

					users[req.token ?? ''] = { username, count: 0 };
				}
				users[req.token ?? ''].count += 1;
				fs.writeJsonSync(path('auth.json'), { users }, { spaces: 4 });

				log.debug('Upload request flow completed', '');
			});
	}).catch(next);
});

export default router;
