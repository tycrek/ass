import { AssFile, AssUser, NID } from 'ass';

import { log } from './log';
import { UserConfig } from './UserConfig';
import { DBManager } from './sql/database';

/**
 * Switcher type for exported functions
 */
type DataSector = 'files' | 'users';

/**
 * database kind -> name mapping
 */
const DBNAMES = {
	'mysql':    'MySQL',
	'postgres': 'PostgreSQL',
	'mongodb':  'MongoDB',
	'json':     'JSON'
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

export const get = (sector: DataSector, key: NID): Promise<AssFile | AssUser | false> => new Promise(async (resolve, reject) => {
	try {
		const data: AssFile | AssUser | undefined = await DBManager.get(sector === 'files' ? 'assfiles' : 'assusers', key) as AssFile | AssUser | undefined
		(!data) ? resolve(false) : resolve(data);
	} catch (err) {
		reject(err);
	}
});

export const getAll = (sector: DataSector): Promise<{ [key: string]: AssFile | AssUser }> => new Promise(async (resolve, reject) => {
	try {
		// todo: fix MySQL
		const data: { [key: string]: AssFile | AssUser } = await DBManager.getAll(sector === 'files' ? 'assfiles' : 'assusers') as /* AssFile[] | AssUser[] | */ {}
		resolve(data);
	} catch (err) {
		reject(err);
	}
});
