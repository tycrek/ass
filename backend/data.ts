import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { nanoid } from './generators';
import { log } from './log';
import { AssFile, AssUser, NID, FilesSchema, UsersSchema } from 'ass';
import { UserConfig } from './UserConfig';
import { MySql } from './sql/mysql';

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

/**
 * Creates a JSON file with a given empty data template
 */
const createEmptyJson = (filepath: string, emptyData: any): Promise<void> => new Promise(async (resolve, reject) => {
	try {
		if (!(await fs.pathExists(filepath))) {
			await fs.ensureFile(filepath);
			await fs.writeJson(filepath, emptyData, { spaces: '\t' });
		}
		resolve(void 0);
	} catch (err) {
		reject(err);
	}
});

/**
 * Ensures the data files exist and creates them if required
 */
export const ensureFiles = (): Promise<void> => new Promise(async (resolve, reject) => {
	log.debug('Checking data files');

	try {
		// Create data directory
		await fs.ensureDir(path.join('.ass-data'));

		// * Default files.json
		await createEmptyJson(PATHS.files, {
			files: {},
			useSql: false,
			meta: {}
		} as FilesSchema);

		// * Default users.json
		await createEmptyJson(PATHS.users, {
			tokens: [],
			users: {},
			cliKey: nanoid(32),
			useSql: false,
			meta: {}
		} as UsersSchema);

		log.debug('Data files exist');
		resolve();
	} catch (err) {
		log.error('Failed to verify existence of data files');
		reject(err);
	}
});

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
		const useSql = MySql.ready;

		if (sector === 'files') {

			// * 1: Save as files (image, video, etc)
			data = data as AssFile;
			if (!useSql) {

				// ? Local JSON
				const filesJson = await fs.readJson(PATHS.files) as FilesSchema;

				// Check if key already exists
				if (filesJson.files[key] != null) return reject(new Error(`File key ${key} already exists`));

				// Otherwise add the data
				filesJson.files[key] = data;

				// Also save the key to the users file
				const usersJson = await fs.readJson(PATHS.users) as UsersSchema;
				// todo: uncomment this once users are implemented
				// usersJson.users[data.uploader].files.push(key);

				// Save the files
				await bothWriter(filesJson, usersJson);
			} else {

				// ? SQL
				if (!(await MySql.get('assfiles', key))) await MySql.put('assfiles', key, data);
				else return reject(new Error(`File key ${key} already exists`));

				// todo: modify users SQL files property
			}
		} else {

			// * 2: Save as users
			data = data as AssUser;
			if (!useSql) {

				// ? Local JSON
				const usersJson = await fs.readJson(PATHS.users) as UsersSchema;

				// Check if key already exists
				if (usersJson.users[key] != null) return reject(new Error(`User key ${key} already exists`));

				// Otherwise add the data
				usersJson.users[key] = data;

				await fs.writeJson(PATHS.users, usersJson, { spaces: '\t' });
			} else {

				// ? SQL
				if (!(await MySql.get('assusers', key))) await MySql.put('assusers', key, data);
				else return reject(new Error(`User key ${key} already exists`));
			}
		}

		log.info(`PUT ${sector} data`, `using ${useSql ? 'SQL' : 'local JSON'}`, key);
		resolve(void 0);
	} catch (err) {
		reject(err);
	}
});

export const get = (sector: DataSector, key: NID): Promise<AssFile | AssUser | false> => new Promise(async (resolve, reject) => {
	try {
		const data: AssFile | AssUser | undefined = (MySql.ready)
			? (await MySql.get(sector === 'files' ? 'assfiles' : 'assusers', key) as AssFile | AssUser | undefined)
			: (await fs.readJson(PATHS[sector]))[sector][key];
		(!data) ? resolve(false) : resolve(data);
	} catch (err) {
		reject(err);
	}
});
