const fs = require('fs-extra');
const escape = require('escape-html');
const fetch = require('node-fetch');
const { deleteS3 } = require('../storage');
const { diskFilePath, s3enabled } = require('../config.json');
const { path, log, getTrueHttp, getTrueDomain, formatBytes, formatTimestamp, getS3url, getDirectUrl, getResourceColor, replaceholder } = require('../utils');
const { CODE_UNAUTHORIZED, CODE_NOT_FOUND, } = require('../MagicNumbers.json');
const data = require('../data');
const users = require('../auth');

const express = require('express');
const router = express.Router();

// Middleware for parsing the resource ID and handling 404
router.use((req, res, next) => {
	// Parse the resource ID
	req.ass = { resourceId: escape(req.resourceId || '').split('.')[0] };

	// If the ID is invalid, return 404. Otherwise, continue normally
	data.has(req.ass.resourceId)
		.then((has) => has ? next() : res.sendStatus(CODE_NOT_FOUND)) // skipcq: JS-0229
		.catch(next);
});

// View file
router.get('/', (req, res, next) => data.get(req.ass.resourceId).then((fileData) => {
	const { resourceId } = req.ass;

	// Build OpenGraph meta tags
	const og = fileData.opengraph, ogs = [''];
	og.title && (ogs.push(`<meta property="og:title" content="${og.title}">`)); // skipcq: JS-0093
	og.description && (ogs.push(`<meta property="og:description" content="${og.description}">`)); // skipcq: JS-0093
	og.author && (ogs.push(`<meta property="og:site_name" content="${og.author}">`)); // skipcq: JS-0093
	og.color && (ogs.push(`<meta name="theme-color" content="${getResourceColor(og.color, fileData.vibrant)}">`)); // skipcq: JS-0093
	!fileData.is.video && (ogs.push(`<meta name="twitter:card" content="summary_large_image">`)); // skipcq: JS-0093

	// Send the view to the client
	res.render('view', {
		fileIs: fileData.is,
		title: escape(fileData.originalname),
		mimetype: fileData.mimetype,
		uploader: users[fileData.token].username,
		timestamp: formatTimestamp(fileData.timestamp),
		size: formatBytes(fileData.size),
		color: getResourceColor(fileData.opengraph.color || null, fileData.vibrant),
		resourceAttr: { src: getDirectUrl(resourceId) },
		discordUrl: `${getDirectUrl(resourceId)}${fileData.ext}`,
		oembedUrl: `${getTrueHttp()}${getTrueDomain()}/${resourceId}/oembed`,
		ogtype: fileData.is.video ? 'video.other' : fileData.is.image ? 'image' : 'website',
		urlType: `og:${fileData.is.video ? 'video' : fileData.is.audio ? 'audio' : 'image'}`,
		opengraph: replaceholder(ogs.join('\n'), fileData.size, fileData.timestamp, fileData.originalname)
	});
}).catch(next));

// Direct resource
router.get('/direct*', (req, res, next) => data.get(req.ass.resourceId).then((fileData) => {
	// Send file as an attachement for downloads
	if (req.query.download)
		res.header('Content-Disposition', `attachment; filename="${fileData.originalname}"`);

	// Return the file differently depending on what storage option was used
	const uploaders = {
		s3: () => fetch(getS3url(fileData.randomId, fileData.ext)).then((file) => {
			file.headers.forEach((value, header) => res.setHeader(header, value));
			file.body.pipe(res);
		}),
		local: () => {
			res.header('Accept-Ranges', 'bytes').header('Content-Length', fileData.size).type(fileData.mimetype);
			fs.createReadStream(fileData.path).pipe(res);
		}
	};

	uploaders[s3enabled ? 's3' : 'local']();
}).catch(next));

// Thumbnail response
router.get('/thumbnail', (req, res, next) =>
	data.get(req.ass.resourceId)
		.then(({ is, thumbnail }) => fs.readFile((!is || (is.image || is.video)) ? path(diskFilePath, 'thumbnails/', thumbnail) : is.audio ? 'views/ass-audio-icon.png' : 'views/ass-file-icon.png'))
		.then((fileData) => res.type('jpg').send(fileData))
		.catch(next));

// oEmbed response for clickable authors/providers
// https://oembed.com/
// https://old.reddit.com/r/discordapp/comments/82p8i6/a_basic_tutorial_on_how_to_get_the_most_out_of/
router.get('/oembed', (req, res, next) =>
	data.get(req.ass.resourceId)
		.then(({ opengraph, is, size, timestamp, originalname }) =>
			res.type('json').send({
				version: '1.0',
				type: is.video ? 'video' : is.image ? 'photo' : 'link',
				author_url: opengraph.authorUrl,
				provider_url: opengraph.providerUrl,
				author_name: replaceholder(opengraph.author || '', size, timestamp, originalname),
				provider_name: replaceholder(opengraph.provider || '', size, timestamp, originalname)
			}))
		.catch(next));

// Delete file
router.get('/delete/:deleteId', (req, res, next) => {
	let oldName, oldType; // skipcq: JS-0119
	data.get(req.ass.resourceId)
		.then((fileData) => {
			// Extract info for logs
			oldName = fileData.originalname;
			oldType = fileData.mimetype;

			// Clean deleteId
			const deleteId = escape(req.params.deleteId);

			// If the delete ID doesn't match, don't delete the file
			if (deleteId !== fileData.deleteId) return res.sendStatus(CODE_UNAUTHORIZED);

			// Save the file information
			return Promise.all([
				s3enabled ? deleteS3(fileData) : fs.rmSync(path(fileData.path)),
				(!fileData.is || (fileData.is.image || fileData.is.video)) && fs.existsSync(path(diskFilePath, 'thumbnails/', fileData.thumbnail))
					? fs.rmSync(path(diskFilePath, 'thumbnails/', fileData.thumbnail)) : () => Promise.resolve()]);
		})
		.then(() => data.del(req.ass.resourceId))
		.then(() => (log.success('Deleted', oldName, oldType), res.type('text').send('File has been deleted!'))) // skipcq: JS-0090
		.catch(next);
});

module.exports = router;
