import { TLog } from '@tycrek/log';
import fs from 'fs-extra';
import path from 'path';

const log = new TLog();
const uploadsPath = path.join(process.cwd(), 'uploads/');
const dataPath = path.join(process.cwd(), 'data.json');

if (fs.existsSync(uploadsPath)) {
	fs.removeSync(uploadsPath);
	log.success('Deleted', uploadsPath);
}
if (fs.existsSync(dataPath)) {
	fs.removeSync(dataPath);
	log.success('Deleted', dataPath);
}
