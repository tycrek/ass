import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { TLog } from '@tycrek/log';
const log = new TLog();

const FILES = {
	prefix: 'dist/frontend',
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

