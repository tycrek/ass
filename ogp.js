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
	description = '';
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

	setDescription(description) {
		this.description = description;
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
		return Mustache.render(html, {
			github,

			http: this.http,
			domain: this.domain,
			resourceId: this.resourceId,

			ogtype: this.type.includes('video') ? 'video.other' : 'image',
			type: this.type.includes('video') ? 'video' : 'image',
			ext: this.type.includes('video') ? '.mp4' : '',

			title: (this.title.length != 0) ? `<meta property="og:title" content="${this.title}">` : '',
			description: (this.description.length != 0) ? `<meta property="og:description" content="${this.description}">` : '',
			site: (this.author.length != 0) ? `<meta property="og:site_name" content="${this.author}">` : '',
			color: (this.color.length != 0) ? `<meta name="theme-color" content="${this.color}">` : '',
			card: !this.type.includes('video') ? `<meta name="twitter:card" content="summary_large_image">` : '',
		});
	}
}

const html = `
<html>
  <head>
    <title>ass</title>
    <meta property="og:type" content="{{{ogtype}}}">
    <meta property="og:{{{type}}}" content="{{{http}}}{{{domain}}}/{{{resourceId}}}{{{ext}}}">
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
