import { AssFile, AssUser, DatabaseValue, NID } from 'ass';

import { log } from './log.js';
import { UserConfig } from './UserConfig.js';
import { DBManager } from './sql/database.js';

/**
 * Switcher type for exported functions
 */
type DataSector = 'files' | 'users';

/**
 * database kind -> name mapping
 */
const DBNAMES = {
	'mysql': 'MySQL',
	'postgres': 'PostgreSQL',
	'json': 'JSON'
};

export const put = (sector: DataSector, key: NID, data: AssFile | AssUser): Promise<void> => new Promise(async (resolve, reject) => {
	try {
		if (sector === 'files') {
			// * 1: Save as files (image, video, etc)
			await DBManager.put('assfiles', key, data as AssFile);
		} else {
			// * 2: Save as users
			await DBManager.put('assusers', key, data as AssUser);
		}

		log.info(`PUT ${sector} data`, `using ${DBNAMES[UserConfig.config.database?.kind ?? 'json']}`, key);
		resolve(void 0);
	} catch (err) {
		reject(err);
	}
});

export const get = (sector: DataSector, key: NID): Promise<DatabaseValue> => new Promise(async (resolve, reject) => {
	try {
		const data = await DBManager.get(sector === 'files' ? 'assfiles' : 'assusers', key);
		resolve(data);
	} catch (err) {
		reject(err);
	}
});

export const getAll = (sector: DataSector): Promise<DatabaseValue[]> => new Promise(async (resolve, reject) => {
	try {
		const data = await DBManager.getAll(sector === 'files' ? 'assfiles' : 'assusers');
		resolve(data);
	} catch (err) {
		reject(err);
	}
});
