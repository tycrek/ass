const Mustache = require('mustache');
const github = require('./package.json').homepage;

// 
class OpenGraph {
	http;
	domain;
	resourceId;

	filename;
	type;
	size;

	title = '';
	author = '';
	color = '';
	showSize = false;

	constructor(http, domain, resourceId, { originalname, mimetype, size }) {
		this.http = http;
		this.domain = domain;
		this.resourceId = resourceId;

		this.type = mimetype;
		this.filename = originalname;
		this.size = size;
	}

	setTitle(title) {
		this.title = title;
		return this;
	}

	setAuthor(author) {
		this.author = author;
		return this;
	}

	setColor(color) {
		this.color = color;
		return this;
	}

	setShowSize(showSize) {
		this.showSize = showSize;
		return this;
	}

	build() {
		let view = {
			github,

			http: this.http,
			domain: this.domain,
			resourceId: this.resourceId,

			ogtype: this.type.includes('video') ? 'video.other' : 'image',
			type: this.type.includes('video') ? 'video' : 'image',
			ext: this.type.includes('video') ? '.mp4' : '',
		};

		view.title = (this.title.length != 0) ? `<meta property="og:title" content="${this.title}">` : '';
		view.site = (this.author.length != 0) ? `<meta property="og:site_name" content="${this.author}">` : '';
		view.color = (this.color.length != 0) ? `<meta name="theme-color" content="${this.color}">` : '';
		view.card = !this.type.includes('video') ? `<meta name="twitter:card" content="summary_large_image">` : '';

		return Mustache.render(html, view);
	}
}

const html = `
<html>
  <head>
    <title>ass</title>
    <meta property="og:type" content="{{{ogtype}}}">
    <meta property="og:{{{type}}}" content="{{{http}}}{{{domain}}}/{{{resourceId}}}{{{ext}}}">
    {{{title}}}
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
