import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { nanoid } from 'nanoid';
import { log } from './log';
import { AssFile, AssUser, NID, FilesSchema, UsersSchema } from 'ass';

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
			files: [],
			meta: {}
		} as FilesSchema);

		// * Default users.json
		await createEmptyJson(PATHS.users, {
			tokens: [],
			users: [],
			cliKey: nanoid(32),
			meta: {}
		} as UsersSchema);

		log.debug('Data files exist');
		resolve();
	} catch (err) {
		log.error('Failed to verify existence of data files');
		reject(err);
	}
});
