import { AssFile, AssUser, NID, FilesSchema, UsersSchema } from 'ass';

import fs from 'fs-extra';
import { path } from '@tycrek/joint';

import { log } from './log';
import { UserConfig } from './UserConfig';
import { DBManager } from './sql/database';

/**
 * Switcher type for exported functions
 */
type DataSector = 'files' | 'users';

/**
 * Absolute filepaths for JSON data files
 */
const PATHS = {
    files: path.join('.ass-data/files.json'),
    users: path.join('.ass-data/users.json')
};

const bothWriter = async (files: FilesSchema, users: UsersSchema) => {
	await fs.writeJson(PATHS.files, files, { spaces: '\t' });
	await fs.writeJson(PATHS.users, users, { spaces: '\t' });
};

export const setDataModeToSql = (): Promise<void> => new Promise(async (resolve, reject) => {
	log.debug('Setting data mode to SQL');

	// Main config check
	if (!UserConfig.ready || !UserConfig.config.sql?.mySql) return reject(new Error('MySQL not configured'));
	const mySqlConf = UserConfig.config.sql.mySql;

	// Read data files
	const [files, users]: [FilesSchema, UsersSchema] = await Promise.all([fs.readJson(PATHS.files), fs.readJson(PATHS.users)]);

	// Check the MySQL configuration
	const checker = (val: string) => val != null && val !== '';
	const issue =
		!checker(mySqlConf.host) ? 'Missing MySQL Host'
			: !checker(mySqlConf.user) ? 'Missing MySQL User'
				: !checker(mySqlConf.password) ? 'Missing MySQL Password'
					: !checker(mySqlConf.database) ? 'Missing MySQL Database'

						// ! Blame VS Code for this weird indentation
						: undefined;

	// Set the vars
	files.useSql = issue == null;
	users.useSql = issue == null;

	// Write data & return
	await bothWriter(files, users);
	(issue) ? reject(new Error(issue)) : resolve(void 0);
});

export const put = (sector: DataSector, key: NID, data: AssFile | AssUser): Promise<void> => new Promise(async (resolve, reject) => {
	try {
		const useSql = UserConfig.config.sql != undefined;

		if (sector === 'files') {
			// * 1: Save as files (image, video, etc)
			await DBManager.put('assfiles', key, data as AssFile);
		} else {
			// * 2: Save as users
			await DBManager.put('assusers', key, data as AssUser);
		}

		log.info(`PUT ${sector} data`, `using ${useSql ? 'SQL' : 'local JSON'}`, key);
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
