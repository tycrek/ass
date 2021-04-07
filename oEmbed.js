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
	return ({
		type: 'video',
		version: '1.0',
		width,
		height,
		html: getHtml().replace('{{{src}}}', url).replace('{{{width}}}', width).replace('{{{height}}}', height),

		title: "Rick Astley - Never Gonna Give You Up (Video)",
		author_name: "RickAstleyVEVO",
		author_url: "https://www.youtube.com/user/RickAstleyVEVO",
		provider_name: "YouTube",
		provider_url: "https://www.youtube.com/",
	});
}

function getHtml() {
	return '<iframe src="{{{src}}}.mp4" frameborder="0" scrolling="no" width="{{{width}}}" height="{{{height}}}" allowfullscreen></iframe>';
}