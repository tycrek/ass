import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { nanoid } from 'nanoid';
import { log } from './log';
import { AssFile, AssUser, NID, FilesSchema, UsersSchema } from 'ass';
import { UserConfig } from './UserConfig';

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
