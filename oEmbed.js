/*
Spec: https://oembed.com/
Example: <link rel="alternate" type="application/json+oembed" href="https://api.streamable.com/oembed?url=https://streamable.com/12txw7" title="oEmbed">
*/

const fs = require('fs-extra');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const { path } = require('./utils');

module.exports = (url, file) =>
	new Promise((resolve, reject) =>
		ffprobe(file, { path: ffprobeStatic.path })
			.then((meta) => generateJson(url, meta.streams[0].width, meta.streams[0].height))
			.then(resolve)
			.catch(reject));

function generateJson(url, width, height) {
	return new Promise((resolve, reject) =>
		fs.readFile(path('oEmbed.html'))
			.then((bytes) => bytes.toString())
			.then((html) => ({
				type: 'video',
				version: 1.0,
				title: 'Test',
				author_name: 'ass',
				width,
				height,
				html: html.replace('{{{src}}}', url).replace('{{{width}}}', width).replace('{{{height}}}', height)
			}))
			.then(resolve)
			.catch(reject));
}