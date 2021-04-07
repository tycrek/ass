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
		"height": 718,
		"html": "<iframe class=\"streamable-embed\" src=\"https://streamable.com/o/12txw7\" frameborder=\"0\" scrolling=\"no\" width=\"1080\" height=\"718\" allowfullscreen></iframe>",
		"provider_name": "Streamable",
		"provider_url": "https://streamable.com",
		"thumbnail_url": "//cdn-cf-east.streamable.com/image/12txw7.jpg?Expires=1618007820&Signature=jIK07C3KE44XAjz5C-AVd4~RlXGrS5umUwpWnL-koDhDm4WlkqZw2YqA6n4PewLy0u2vem16gouBMzpU1aenr39zVqUp3tdz~1B1pdeQZWLQnQsXiXb3ljuFHZXF-CAloIXI-Lz-zBQeAQ-UJ2DvcU3g9LXtDVs-HtK3tN4PZBARnmNvnYhwPjxDkUHV295QGs8tPelxZ6k-ZTlAs8QvL6KG3eAHMVLmxzxX9LjpgoKCNfLmBB2~mua1nHR7IM2~C17i~L-le~VxoQYu3PrlLcMLcH7x968PgZXNUqWWcRBFO~0aMTO32iCxTunHxxnjg7SoqWsh2CKTt2M1z-Y7CQ__&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ",
		"title": "s",
		"type": "video",
		"version": "1.0",
		"width": 1080
	})
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

		thumbnail_height: 360,
		thumbnail_width: 480,
		thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	});
}

function getHtml() {
	return '<iframe src="{{{src}}}.mp4" frameborder="0" scrolling="no" width="{{{width}}}" height="{{{height}}}" allowfullscreen></iframe>';
}