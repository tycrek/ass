import { FileData, IsPossible } from '../types/definitions';
import { Config, MagicNumbers } from 'ass-json';

import fs from 'fs-extra';
import escape from 'escape-html';
import fetch, { Response as FetchResponse } from 'node-fetch';
import { Request, Response } from 'express';
import { deleteS3 } from '../storage';
import { SkynetDelete, SkynetDownload } from '../skynet';
import { path, log, getTrueHttp, getTrueDomain, formatBytes, formatTimestamp, getS3url, getDirectUrl, getResourceColor, replaceholder } from '../utils';
const { diskFilePath, s3enabled, viewDirect, useSia }: Config = fs.readJsonSync(path('config.json'));
const { CODE_UNAUTHORIZED, CODE_NOT_FOUND, }: MagicNumbers = fs.readJsonSync(path('MagicNumbers.json'));
import { data } from '../data';
import { users } from '../auth';

import express from 'express';
const router = express.Router();

let theme = {};
if (fs.existsSync(path('share/', 'theme.json')))
	theme = fs.readJsonSync(path('share/', 'theme.json'));

// Middleware for parsing the resource ID and handling 404
router.use((req: Request, res: Response, next) => {
	// Parse the resource ID
	req.ass = { resourceId: escape(req.resourceId || '').split('.')[0] };

	// If the ID is invalid, return 404. Otherwise, continue normally
	data().has(req.ass.resourceId)
		.then((has: boolean) => has ? next() : res.sendStatus(CODE_NOT_FOUND)) // skipcq: JS-0229
		.catch(next);
});

// View file
router.get('/', (req: Request, res: Response, next) => data().get(req.ass.resourceId).then((fileData: FileData) => {
	const resourceId = req.ass.resourceId;

	// Build OpenGraph meta tags
	const og = fileData.opengraph, ogs = [''];
	og.title && (ogs.push(`<meta property="og:title" content="${og.title}">`)); // skipcq: JS-0093
	og.description && (ogs.push(`<meta property="og:description" content="${og.description}">`)); // skipcq: JS-0093
	// todo: figure out how to not ignore this
	// @ts-ignore
	og.color && (ogs.push(`<meta name="theme-color" content="${getResourceColor(og.color, fileData.vibrant)}">`)); // skipcq: JS-0093
	!fileData.is.video && (ogs.push(`<meta name="twitter:card" content="summary_large_image">`)); // skipcq: JS-0093

	// Send the view to the client
	res.render('view', {
		fileIs: fileData.is,
		title: escape(fileData.originalname),
		mimetype: fileData.mimetype,
		uploader: users[fileData.token].username,
		timestamp: formatTimestamp(fileData.timestamp, fileData.timeoffset),
		size: formatBytes(fileData.size),
		// todo: figure out how to not ignore this
		// @ts-ignore
		color: getResourceColor(fileData.opengraph.color || null, fileData.vibrant),
		resourceAttr: { src: getDirectUrl(resourceId) },
		discordUrl: `${getDirectUrl(resourceId)}${fileData.ext}`,
		oembedUrl: `${getTrueHttp()}${getTrueDomain()}/${resourceId}/oembed`,
		ogtype: fileData.is.video ? 'video.other' : fileData.is.image ? 'image' : 'website',
		urlType: `og:${fileData.is.video ? 'video' : fileData.is.audio ? 'audio' : 'image'}`,
		opengraph: replaceholder(ogs.join('\n'), fileData.size, fileData.timestamp, fileData.timeoffset, fileData.originalname),
		viewDirect,
		//@ts-ignore
		showAd: theme.showAd ?? true,
	});
}).catch(next));

// Direct resource
router.get('/direct*', (req: Request, res: Response, next) => data().get(req.ass.resourceId).then((fileData: FileData) => {
	// Send file as an attachement for downloads
	if (req.query.download)
		res.header('Content-Disposition', `attachment; filename="${fileData.originalname}"`);

	// Return the file differently depending on what storage option was used
	const uploaders = {
		s3: () => fetch(getS3url(fileData.randomId, fileData.ext)).then((file: FetchResponse) => {
			file.headers.forEach((value, header) => res.setHeader(header, value));
			file.body?.pipe(res);
		}),
		sia: () => SkynetDownload(fileData)
			.then((stream) => stream.pipe(res))
			.then(() => SkynetDelete(fileData)),
		local: () => fs.pathExists(path(fileData.path))
			.then((exists) => new Promise((resolve, reject) => !exists
				? reject(new Error('File does not exist'))
				: res.header('Accept-Ranges', 'bytes')
					.header('Content-Length', `${fileData.size}`)
					.type(fileData.mimetype)
					.sendFile(path(fileData.path), (err) => err ? reject(err) : resolve(void 0))))
	};

	return uploaders[fileData.randomId.startsWith('sia://') ? 'sia' : s3enabled ? 's3' : 'local']();
}).catch(next));

// Thumbnail response
router.get('/thumbnail', (req: Request, res: Response, next) =>
	data().get(req.ass.resourceId)
		.then(({ is, thumbnail }: { is: IsPossible, thumbnail: string }) => fs.readFile((!is || (is.image || is.video)) ? path(diskFilePath, 'thumbnails/', thumbnail) : is.audio ? 'views/ass-audio-icon.png' : 'views/ass-file-icon.png'))
		.then((fileData: Buffer) => res.type('jpg').send(fileData))
		.catch(next));

// oEmbed response for clickable authors/providers
// https://oembed.com/
// https://old.reddit.com/r/discordapp/comments/82p8i6/a_basic_tutorial_on_how_to_get_the_most_out_of/
router.get('/oembed', (req: Request, res: Response, next) =>
	data().get(req.ass.resourceId)
		.then((fileData: FileData) =>
			res.type('json').send({
				version: '1.0',
				type: fileData.is.video ? 'video' : fileData.is.image ? 'photo' : 'link',
				author_url: fileData.opengraph.authorUrl,
				provider_url: fileData.opengraph.providerUrl,
				// todo: figure out how to not ignore this
				// @ts-ignore
				author_name: replaceholder(fileData.opengraph.author || '', fileData.size, fileData.timestamp, fileData.timeoffset, fileData.originalname),
				// todo: figure out how to not ignore this
				// @ts-ignore
				provider_name: replaceholder(fileData.opengraph.provider || '', fileData.size, fileData.timestamp, fileData.timeoffset, fileData.originalname)
			}))
		.catch(next));

// Delete file
router.get('/delete/:deleteId', (req: Request, res: Response, next) => {
	let oldName: string, oldType: string; // skipcq: JS-0119
	data().get(req.ass.resourceId)
		.then((fileData: FileData) => {
			// Extract info for logs
			oldName = fileData.originalname;
			oldType = fileData.mimetype;

			// Clean deleteId
			const deleteId = escape(req.params.deleteId);

			// If the delete ID doesn't match, don't delete the file
			if (deleteId !== fileData.deleteId) return res.sendStatus(CODE_UNAUTHORIZED);

			// Save the file information
			return Promise.all([
				s3enabled ? deleteS3(fileData) : !useSia ? fs.rmSync(path(fileData.path)) : () => Promise.resolve(),
				(!fileData.is || (fileData.is.image || fileData.is.video)) && fs.existsSync(path(diskFilePath, 'thumbnails/', fileData.thumbnail))
					? fs.rmSync(path(diskFilePath, 'thumbnails/', fileData.thumbnail)) : () => Promise.resolve()]);
		})
		.then(() => data().del(req.ass.resourceId))
		.then(() => (log.success('Deleted', oldName, oldType), res.type('text').send('File has been deleted!'))) // skipcq: JS-0090
		.catch(next);
});

export default router;
