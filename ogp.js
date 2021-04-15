/*

Optional:
- og:title
- og:description
- og:site_name

*/
const Mustache = require('mustache');

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

	setShowSize(showSize) {
		this.showSize = showSize;
		return this;
	}

	build() {
		let view = {
			http: this.http,
			domain: this.domain,
			resourceId: this.resourceId,

			ogtype: this.type.includes('video') ? 'video.other' : 'image',
			type: this.type.includes('video') ? 'video' : 'image',
			ext: this.type.includes('video') ? '.mp4' : '',
		};

		view.title = (this.title.length != 0) ? `<meta property="og:title" content="${this.title}">` : '';
		view.site = (this.author.length != 0) ? `<meta property="og:site_name" content="${this.author}">` : '';

		return Mustache.render(html, view);
	}
}

const html = `
<html>
  <head>
    <title>ass</title>
    <meta property="og:type" content="{{ogtype}}">
    <meta property="og:{{type}}" content="{{http}}{{domain}}/{{resourceId}}{{ext}}">
	{{title}}
	{{site}}
  </head>
  <body>ass</body>
</html>
`;

module.exports = OpenGraph;
