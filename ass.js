try {
	// Check if config.json exists
	require('./config.json');
} catch (err) {
	console.error('No config.json found! Please run \'npm run setup\'');
	process.exit(1);
}

// Load the config
const { host, port, domain, useSsl, resourceIdSize, resourceIdType, discordMode, isProxied } = require('./config.json');

//#region Imports
const fs = require('fs-extra');
const uuid = require('uuid').v4;
const express = require('express');
const useragent = require('express-useragent');
const multer = require('multer');
const oEmbed = require('./oEmbed');
const { path, saveData, log, verify, generateId } = require('./utils');
//#endregion

//#region Variables, module setup
const app = express();
const upload = multer({ dest: 'uploads/' });
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
		tokens.push(uuid().replace(/-/g, ''));
		fs.writeJsonSync(path('auth.json'), { tokens }, { spaces: 4 });
		log(`File [auth.json] created\n!! Important: save this token in a secure spot: ${tokens[0]}\n`);
	} else log('File [auth.json] exists');

	// Read tokens and data
	tokens = fs.readJsonSync(path('auth.json')).tokens;
	data = fs.readJsonSync(path('data.json'));
	log('Tokens & data read from filesystem');
}

function startup() {
	app.use(useragent.express());

	// Upload file
	app.post('/', upload.single('file'), (req, res) => {
		// Prevent uploads from unauthorized clients
		if (!verify(req, tokens)) return res.sendStatus(401);

		log(`Uploaded: ${req.file.originalname} (${req.file.mimetype})`);

		// Save the file information
		let resourceId = generateId(resourceIdType, resourceIdSize, req.file.originalname);
		data[resourceId.split('.')[0]] = req.file;
		saveData(data);

		let http = getTrueHttp();
		let trueDomain = getTrueDomain();
		//let discordCompat = (discordMode && req.file.mimetype == 'video/mp4') ? '.mp4' : '';
		let discordCompat = '';
		res.type('json').send({
			resource: `${http}${trueDomain}/${resourceId}${discordCompat}`,
			delete: `${http}${trueDomain}/delete/${req.file.filename}`
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

		if (req.useragent.isBot) {
			return res.type('html').send(genHtml(resourceId));
		}

		// Read the file and send it to the client
		fs.readFile(path(data[resourceId].path))
			.then((fileData) => res
				.header('Accept-Ranges', 'bytes')
				.header('Content-Length', fileData.byteLength)
				.type(data[resourceId].mimetype).send(fileData))
			.catch(console.error);
	});

	app.get('/oembed/:resourceId', (req, res) => {
		// Parse the resource ID
		let resourceId = req.params.resourceId.split('.')[0];

		// If the ID is invalid, return 400
		if (!resourceId || !data[resourceId]) return res.sendStatus(400);

		oEmbed(`${getTrueHttp()}${getTrueDomain()}/${resourceId}`, path(data[resourceId].path))
			.then((json) => res.type('json').send(json))
			.catch(console.error);
	})

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
function getTrueDomain() {
	return domain.concat((port == 80 || port == 443 || isProxied) ? '' : `:${port}`);
}

function genHtml(resourceId) {
	''
	return `
<html>
  <head>
    <title>ass</title>
	<meta property="og:title" content="s">
	<meta property="og:type" content="video.other">
	<meta property="og:image" content="https://cdn-cf-east.streamable.com/image/12txw7.jpg?Expires=1618068000&amp;Signature=hVmRyXRT~z3~NHmb6AFPl2li9b9dTZ76eDn7n5Hw3peZ7YLcLSL4CNehd2yq421vXLQUy8JPuvncwwVtsCUke3xh0V~GEyzJM-PnMsAyMv64ISUKH8aL4hFeDVDWvPEdli0oXfMcAG5RRIxy2papv2jwI9CxB6gkW58gaxwQBWx6~FGURFbz8IyIzraczi-s-duv1ofdUWGR1QQ8mq01vMNGBTR5H-vJswEfb4UuMx3QO-x527F4888u-5L~UEkVDhMW0S8xfhlc2ZXcILnJmo4Ehbk-tM9FymkADEywLtWI94vnSvHM-DY16UiMmJpTpuCOHtF1IhwFaKfYWWXsOA__&amp;Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ">
	<meta property="og:url" content="https://streamable.com/12txw7">
	<meta property="og:video" content="https://cdn-cf-east.streamable.com/video/mp4/12txw7.mp4?Expires=1618068000&amp;Signature=ZDjN-pV91ouVnVt2bmaq4nnWh56hStKeqpeH0C6v4zzfTHUR8OL6ASoG-Vzahk5SpKZDOp4ownnj3I1lF5PZpr28hIeFpBfIxj0iAkfnS1SEReLqlMnvPGCjB8MkCraKTzwgDyJGkTefbpU0ZvqRyZxEQayn06QY1YrvL3Gj27hAGtHsweJbYZwaW7xOv0fMtp4E63a2pAguXQEyvrB9RIMKfbh7LARRq4yJz8nNTpd0wGzLYLSGMM29CnCfC7Fh74KidjFq~2oRO71jph2yi3Z4IfCHAKFzFntlmTRvRhapDBxdtF2snF8cMaSnoQKDStAVISRZ3xa5qxo5t-yNQw__&amp;Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ">
	<meta property="og:video:url" content="https://cdn-cf-east.streamable.com/video/mp4/12txw7.mp4?Expires=1618068000&amp;Signature=ZDjN-pV91ouVnVt2bmaq4nnWh56hStKeqpeH0C6v4zzfTHUR8OL6ASoG-Vzahk5SpKZDOp4ownnj3I1lF5PZpr28hIeFpBfIxj0iAkfnS1SEReLqlMnvPGCjB8MkCraKTzwgDyJGkTefbpU0ZvqRyZxEQayn06QY1YrvL3Gj27hAGtHsweJbYZwaW7xOv0fMtp4E63a2pAguXQEyvrB9RIMKfbh7LARRq4yJz8nNTpd0wGzLYLSGMM29CnCfC7Fh74KidjFq~2oRO71jph2yi3Z4IfCHAKFzFntlmTRvRhapDBxdtF2snF8cMaSnoQKDStAVISRZ3xa5qxo5t-yNQw__&amp;Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ">
	<meta property="og:video:type" content="video/mp4">
	<meta property="og:video:width" content="1080">
	<meta property="og:video:height" content="718">
    <link rel="alternate" type="application/json+oembed" href="${getTrueHttp()}${getTrueDomain()}/oembed/${resourceId}" title="oEmbed">
  </head>
  <body>ass</body>
</html>
`;
}
