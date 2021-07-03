const fs = require('fs-extra');
const escape = require('escape-html');
const fetch = require('node-fetch');
const { deleteS3 } = require('../storage');
const { diskFilePath, s3enabled } = require('../config.json');
const { path, saveData, log, getTrueHttp, getTrueDomain, formatBytes, formatTimestamp, getS3url, getDirectUrl, getSafeExt, getResourceColor, replaceholder } = require('../utils');
const { CODE_BAD_REQUEST, CODE_UNAUTHORIZED, CODE_NOT_FOUND, } = require('../MagicNumbers.json');
const data = require('../data');
const users = require('../auth');

const express = require('express');
const router = express.Router();

// Middleware for parsing the resource ID and handling 404
router.use((req, res, next) => {
	// Parse the resource ID
	req.ass = { resourceId: escape(req.resourceId).split('.')[0] };

	// If the ID is invalid, return 404. Otherwise, continue normally // skipcq: JS-0093
	(!req.ass.resourceId || !data[req.ass.resourceId]) ? res.sendStatus(CODE_NOT_FOUND) : next();
});

// View file
router.get('/', (req, res) => {
	const { resourceId } = req.ass;
	const fileData = data[resourceId];
	const isVideo = fileData.mimetype.includes('video');

	// Build OpenGraph meta tags
	const og = fileData.opengraph, ogs = [''];
	og.title && (ogs.push(`<meta property="og:title" content="${og.title}">`)); // skipcq: JS-0093
	og.description && (ogs.push(`<meta property="og:description" content="${og.description}">`)); // skipcq: JS-0093
	og.author && (ogs.push(`<meta property="og:site_name" content="${og.author}">`)); // skipcq: JS-0093
	og.color && (ogs.push(`<meta name="theme-color" content="${getResourceColor(og.color, fileData.vibrant)}">`)); // skipcq: JS-0093
	!isVideo && (ogs.push(`<meta name="twitter:card" content="summary_large_image">`)); // skipcq: JS-0093

	// Send the view to the client
	res.render('view', {
		isVideo,
		title: escape(fileData.originalname),
		uploader: users[fileData.token].username,
		timestamp: formatTimestamp(fileData.timestamp),
		size: formatBytes(fileData.size),
		color: getResourceColor(fileData.opengraph.color || null, fileData.vibrant),
		resourceAttr: { src: getDirectUrl(resourceId) },
		discordUrl: `${getDirectUrl(resourceId)}${getSafeExt(fileData.mimetype)}`,
		oembedUrl: `${getTrueHttp()}${getTrueDomain()}/${resourceId}/oembed`,
		ogtype: isVideo ? 'video.other' : 'image',
		urlType: `og:${isVideo ? 'video' : 'image'}`,
		opengraph: replaceholder(ogs.join('\n'), fileData)
	});
});

// Direct resource
router.get('/direct*', (req, res) => {
	const { resourceId } = req.ass;
	const fileData = data[resourceId];

	// Send file as an attachement for downloads
	if (req.query.download)
		res.header('Content-Disposition', `attachment; filename="${fileData.originalname}"`);

	// Return the file differently depending on what storage option was used
	const uploaders = {
		s3: () => fetch(getS3url(fileData.randomId, fileData.mimetype)).then((file) => {
			file.headers.forEach((value, header) => res.setHeader(header, value));
			file.body.pipe(res);
		}),
		local: () => {
			res.header('Accept-Ranges', 'bytes').header('Content-Length', fileData.size).type(fileData.mimetype);
			fs.createReadStream(fileData.path).pipe(res);
		}
	};

	uploaders[s3enabled ? 's3' : 'local']();
});

// Thumbnail response
router.get('/thumbnail', (req, res) => {
	const { resourceId } = req.ass;

	// Read the file and send it to the client
	fs.readFile(path(diskFilePath, 'thumbnails/', data[resourceId].thumbnail))
		.then((fileData) => res.type('jpg').send(fileData))
		.catch(console.error);
});

// oEmbed response for clickable authors/providers
// https://oembed.com/
// https://old.reddit.com/r/discordapp/comments/82p8i6/a_basic_tutorial_on_how_to_get_the_most_out_of/
router.get('/oembed', (req, res) => {
	const { resourceId } = req.ass;

	// Build the oEmbed object & send the response
	const { opengraph, mimetype } = data[resourceId];
	res.type('json').send({
		version: '1.0',
		type: mimetype.includes('video') ? 'video' : 'photo',
		author_url: opengraph.authorUrl,
		provider_url: opengraph.providerUrl,
		author_name: replaceholder(opengraph.author || '', data[resourceId]),
		provider_name: replaceholder(opengraph.provider || '', data[resourceId])
	});
});

// Delete file
router.get('/delete/:deleteId', (req, res) => {
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

module.exports = router;
