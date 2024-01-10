import { ErrWrap } from '../types/definitions';
import { Config, MagicNumbers, Package, ServerSideEmbed } from 'ass-json';

import fs from 'fs-extra';
import bb from 'express-busboy';
//const rateLimit = require('express-rate-limit');
import { DateTime } from 'luxon';
import { Webhook, EmbedBuilder } from '@tycrek/discord-hookr';

import { processUploaded } from '../storage';
import { path, log, getTrueHttp, getTrueDomain, generateId, formatBytes } from '../utils';
import { data } from '../data';
import { findFromToken, verifyValidToken } from '../auth';

const { maxUploadSize, resourceIdSize, gfyIdSize, resourceIdType, spaceReplace, adminWebhookEnabled, adminWebhookUrl, adminWebhookUsername, adminWebhookAvatar }: Config = fs.readJsonSync(path('config.json'));
const { CODE_UNAUTHORIZED, CODE_PAYLOAD_TOO_LARGE }: MagicNumbers = fs.readJsonSync(path('MagicNumbers.json'));
const { name, version, homepage }: Package = fs.readJsonSync(path('package.json'));

const ASS_LOGO = 'https://cdn.discordapp.com/icons/848274994375294986/8d339d4a2f3f54b2295e5e0ff62bd9e6.png?size=1024';
import express, { Request, Response } from 'express';
const router = express.Router();

// Set up express-busboy
// @ts-ignore
bb.extend(router, {
	upload: true,
	restrictMultiple: true,
	allowedPath: (url: string) => url === '/',
});

// Rate limit middleware
/* router.use('/', rateLimit({
	windowMs: 1000 * 60, // 60 seconds // skipcq: JS-0074
	max: 90 // Limit each IP to 30 requests per windowMs // skipcq: JS-0074
})); */

// Block unauthorized requests and attempt token sanitization
router.post('/', (req: Request, res: Response, next: Function) => {
	req.headers.authorization = req.headers.authorization || '';
	req.token = req.headers.authorization.replace(/[^\da-z_-]/gi, ''); // Strip anything that isn't a digit, ASCII letter, or underscore/hyphen
	!verifyValidToken(req) ? log.warn('Upload blocked', 'Unauthorized').callback(() => res.sendStatus(CODE_UNAUTHORIZED)) : next(); // skipcq: JS-0093
});

// Upload file
router.post('/', processUploaded);

// Max upload size error handling
router.use('/', (err: ErrWrap, _req: Request, res: Response, next: Function) => err.message === 'LIMIT_FILE_SIZE' ? log.warn('Upload blocked', 'File too large').callback(() => res.status(CODE_PAYLOAD_TOO_LARGE).send(`Max upload size: ${maxUploadSize}MB`)) : next(err)); // skipcq: JS-0229

// Process uploaded file
router.post('/', (req: Request, res: Response, next: Function) => {
	// Load overrides
	const trueDomain = getTrueDomain(req.headers['x-ass-domain']?.toString() ?? undefined);
	const generator = req.headers['x-ass-access']?.toString() || resourceIdType;

	// Save domain with file
	req.file.domain = `${getTrueHttp()}${trueDomain}`;

	// Get the uploaded time in milliseconds
	req.file.timestamp = DateTime.now().toMillis();

	// Save the timezone offset
	req.file!.timeoffset = req.headers['x-ass-timeoffset']?.toString() || 'UTC+0';

	// Keep track of the token that uploaded the resource
	req.file.uploader = findFromToken(req.token)?.unid ?? '';

	// Load server-side embed config, if it exists
	const ssePath = path('share/embed.json');
	const sse: ServerSideEmbed | undefined = fs.existsSync(ssePath) ? fs.readJsonSync(path('share/embed.json')) : undefined;
	const useSse = sse && sse.title != undefined && sse.title != '';

	// Attach any embed overrides, if necessary
	req.file.opengraph = {
		title: useSse ? sse.title : req.headers['x-ass-og-title'],
		description: useSse ? sse.description : req.headers['x-ass-og-description'],
		author: useSse ? sse.author : req.headers['x-ass-og-author'],
		authorUrl: useSse ? sse.authorUrl : req.headers['x-ass-og-author-url'],
		provider: useSse ? sse.provider : req.headers['x-ass-og-provider'],
		providerUrl: useSse ? sse.providerUrl : req.headers['x-ass-og-provider-url'],
		color: useSse ? sse.color : req.headers['x-ass-og-color']
	};

	// Fix spaces in originalname
	req.file!.originalname = req.file.originalname.replace(/\s/g, spaceReplace === '!' ? '' : spaceReplace);

	// Generate a unique resource ID
	let resourceId = '';

	// Function to call to generate a fresh ID. Used for multiple attempts in case an ID is already taken
	const gen = () => generateId(generator, resourceIdSize, parseInt(req.headers['x-ass-gfycat']?.toString() || gfyIdSize.toString()), req.file.originalname);

	// Keeps track of the number of attempts in case all ID's are taken
	const attempts = {
		count: 0,
		max: 50
	};

	// Called by a promise, this will recursively resolve itself until a unique ID is found
	function genCheckId(resolve: Function, reject: Function) {
		const uniqueId = gen();
		attempts.count++;
		data().has(uniqueId)
			.then((exists: boolean) => {
				log.debug('ID check', exists ? 'Taken' : 'Available');
				return attempts.count - 1 >= attempts.max ? reject(new Error('No ID\'s remaining')) : exists ? genCheckId(resolve, reject) : resolve(uniqueId);
			})
			.catch(reject);
	}

	new Promise((resolve, reject) => genCheckId(resolve, reject))
		.then((uniqueId) => {
			//@ts-ignore
			resourceId = uniqueId;
			log.debug('Saving data', data.name);
		})
		.then(() => data().put(resourceId.split('.')[0], req.file))
		.then(() => {
			// Log the upload
			const logInfo = `${req.file!.originalname} (${req.file!.mimetype}, ${formatBytes(req.file.size)})`;
			const uploader = findFromToken(req.token)?.username ?? 'Unknown';
			log.success('File uploaded', logInfo, `uploaded by ${uploader}`);

			// ! random thing for 0.14.8 to append the file extension to the resource url
			const extAppend = !(req.headers['x-ass-with-file-ext']?.toString() ?? false) ? ''
				: `.${req.file.originalname.split('.').pop()}`;

			// Build the URLs
			const resourceUrl = `${getTrueHttp()}${trueDomain}/${resourceId}${extAppend}`;
			const thumbnailUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/thumbnail`;
			const deleteUrl = `${getTrueHttp()}${trueDomain}/${resourceId}/delete/${req.file.deleteId}`;

			const buildSendWebhook = (url: string, username: string, avatar: string, admin = false) => {
				if (url === '') return;

				// Build the webhook
				const hook = new Webhook(url);
				hook.setUsername(username);
				hook.setAvatar(avatar);

				// Build the embed
				const embed = new EmbedBuilder()
					.setTitle(logInfo)
					.setURL(resourceUrl)
					.setAuthor({ name: `${name} ${version}`, url: homepage, icon_url: ASS_LOGO })
					.setDescription(`${admin ? `**User:** \`${uploader}\`\n` : ''}**Size:** \`${formatBytes(req.file.size)}\`\n**[Delete](${deleteUrl})**`)
					.setThumbnail({ url: thumbnailUrl })
					.setColor(req.file.vibrant)
					.setTimestamp();

				// Send the embed to the webhook, then delete the client after to free resources
				log.debug(`Sending${admin ? ' admin' : ''} embed to webhook`);
				hook.addEmbed(embed).send()
					.then(() => log.debug(`Webhook${admin ? ' admin' : ''} sent`))
					.catch((err) => (log.error('Webhook error'), console.error(err)));
			}

			// Send the response
			res.type('json').send({ resource: resourceUrl, thumbnail: thumbnailUrl, delete: deleteUrl })
				.on('finish', () => {
					log.debug('Upload response sent');

					// After we have sent the user the response, also send a Webhook to Discord (if headers are present)
					if (req.headers['x-ass-webhook-url'])
						buildSendWebhook(
							req.headers['x-ass-webhook-url']?.toString(),
							req.headers['x-ass-webhook-username']?.toString() || 'ass',
							req.headers['x-ass-webhook-avatar']?.toString() || ASS_LOGO);

					// Send the webhook to the default webhook, if it exists
					if (adminWebhookEnabled)
						buildSendWebhook(
							adminWebhookUrl,
							adminWebhookUsername.trim().length === 0 ? 'ass admin logs' : adminWebhookUsername,
							adminWebhookAvatar.trim().length === 0 ? ASS_LOGO : adminWebhookAvatar,
							true);
					log.debug('Upload request flow completed', '');
				});
		})
		//@ts-ignore
		.catch(next);
});

export default router;
