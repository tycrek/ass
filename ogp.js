const Mustache = require('mustache');
const DateTime = require('luxon').DateTime;
const github = require('./package.json').homepage;
const { formatBytes, randomHexColour } = require('./utils');

// https://ogp.me/
class OpenGraph {
	http;
	domain;
	resourceId;

	filename;
	type;
	size;
	timestamp;

	title;
	description;
	author;
	color;

	constructor(http, domain, resourceId, { originalname, mimetype, size, timestamp, opengraph }) {
		this.http = http;
		this.domain = domain;
		this.resourceId = resourceId;

		this.type = mimetype;
		this.filename = originalname;
		this.size = size;
		this.timestamp = timestamp;

		this.title = opengraph.title || '';
		this.description = opengraph.description || '';
		this.author = opengraph.author || '';
		this.color = opengraph.color || '';
	}

	build() {
		return Mustache.render(html, {
			github,

			http: this.http,
			domain: this.domain,
			resourceId: this.resourceId,

			ogtype: this.type.includes('video') ? 'video.other' : 'image',
			type: this.type.includes('video') ? 'video' : 'image',
			ext: this.type.includes('video') ? '.mp4' : this.type.includes('gif') ? '.gif' : '',

			title: (this.title.length != 0) ? `<meta property="og:title" content="${this.title}">` : '',
			description: (this.description.length != 0) ? `<meta property="og:description" content="${this.description}">` : '',
			site: (this.author.length != 0) ? `<meta property="og:site_name" content="${this.author}">` : '',
			color: (this.color.length != 0) ? `<meta name="theme-color" content="${this.color === '&random' ? randomHexColour() : this.color}">` : '',
			card: !this.type.includes('video') ? `<meta name="twitter:card" content="summary_large_image">` : '',
		})
			.replace(new RegExp('&size', 'g'), formatBytes(this.size))
			.replace(new RegExp('&filename', 'g'), this.filename)
			.replace(new RegExp('&timestamp', 'g'), DateTime.fromMillis(this.timestamp).toLocaleString(DateTime.DATETIME_MED));
	}
}

const html = `
<html>
  <head>
    <title>ass</title>
    <meta property="og:type" content="{{{ogtype}}}">
    <meta property="og:{{{type}}}" content="{{{http}}}{{{domain}}}/{{{resourceId}}}{{{ext}}}">
	<link type="application/json+oembed" href="/{{{resourceId}}}/oembed">
    {{{title}}}
    {{{description}}}
    {{{site}}}
    {{{color}}}
    {{{card}}}
  </head>
  <body>
    Open Graph response for <a href="{{{github}}}" target="_blank">ass</a>.
  </body>
</html>
`;

module.exports = OpenGraph;
