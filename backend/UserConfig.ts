import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { UserConfiguration, UserConfigTypeChecker } from 'ass';
import { log } from './log';

/**
 * Returns a boolean if the provided value is a number
 */
const numChecker = (val: string) => {
	try { return !isNaN(parseInt(val)); }
	catch (err) { return false; }
}

/**
 * User-config property type checker functions
 */
const Checkers: UserConfigTypeChecker = {
	uploadsDir: (val) => {
		try { fs.accessSync(val); return true; }
		catch (err) { return false; }
	},
	idType: (val) => {
		const options = ['random', 'original', 'gfycat', 'timestamp', 'zws'];
		return options.includes(val);
	},
	idSize: numChecker,
	gfySize: numChecker,
	maximumFileSize: numChecker,
}

export class UserConfig {
	private static _config: UserConfiguration;
	private static _ready = false;

	public static get config() { return UserConfig._config; }
	public static get ready() { return UserConfig._ready; }

	constructor(config?: any) {
		// Typically this would only happen during first-time setup (for now)
		if (config != null) {
			UserConfig._config = UserConfig.parseConfig(config);
			UserConfig._ready = true;
		}
	}

	/**
	 * Ensures that all config options are valid
	 */
	private static parseConfig(c: any) {
		const config = (typeof c === 'string' ? JSON.parse(c) : c) as UserConfiguration;

		if (!Checkers.uploadsDir(config.uploadsDir)) throw new Error(`Unable to access uploads directory: ${config.uploadsDir}`);
		if (!Checkers.idType(config.idType)) throw new Error('Invalid ID type');
		if (!Checkers.idSize(config.idSize)) throw new Error('Invalid ID size');
		if (!Checkers.gfySize(config.gfySize)) throw new Error('Invalid Gfy size');
		if (!Checkers.maximumFileSize(config.maximumFileSize)) throw new Error('Invalid maximum file size');

		// All is fine, carry on!
		return config;
	}

	/**
	 * Save the config file to disk
	 */
	public static saveConfigFile(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {

				// Only save is the config has been parsed
				if (!UserConfig._ready) throw new Error('Config not ready to be saved!');

				// Write to file
				await fs.writeFile(path.join('userconfig.json'), JSON.stringify(UserConfig._config, null, '\t'));

				resolve(void 0);
			} catch (err) {
				log.error('Failed to save config file!');
				reject(err);
			}
		});
	}

	/**
	 * Reads the config file from disk
	 */
	public static readConfigFile(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {

				// Read the file data
				const data = (await fs.readFile(path.join('userconfig.json'))).toString();

				// Ensure the config is valid
				UserConfig._config = UserConfig.parseConfig(data);
				UserConfig._ready = true;

				resolve(void 0);
			} catch (err) {
				log.error('Failed to read config file!');
				reject(err);
			}
		});
	}
}
