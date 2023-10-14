const fs = require('fs-extra');
const { path } = require('@tycrek/joint');
const log = new (require('@tycrek/log').TLog)();

const FILES = {
	prefix: 'dist-frontend',
	suffix: '.mjs',
	pages: [
		'setup',
		'login',
		'admin',
		'user',
	]
};

const fixFile = (page) => {
	const filePath = path.join(FILES.prefix, `${page}${FILES.suffix}`);
	const fixed = fs.readFileSync(filePath).toString().replace('export {};', '');

	return fs.writeFile(filePath, fixed);
};

log.info('Fixing frontend JS', `${FILES.pages.length} files`);
Promise.all(FILES.pages.map(fixFile))
	.then(() => log.success('Fixed.'))
	.catch(console.error);

