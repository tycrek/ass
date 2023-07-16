import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { UserConfiguration, UserConfigTypeChecker } from 'ass';
import { log } from './log';

/**
 * Returns a boolean if the provided value is a number
 */
const numChecker = (val: any) => {
	try { return !isNaN(parseInt(val)) && typeof val !== 'string'; }
	catch (err) { return false; }
}

/**
 * Returns a boolean if the provided value is a non-empty string
 */
const basicStringChecker = (val: any) => typeof val === 'string' && val.length > 0;

/**
 * User-config property type checker functions
 */
const Checkers: UserConfigTypeChecker = {
	uploadsDir: (val) => {
		try {
			fs.pathExistsSync(val)
				? fs.accessSync(val)
				: fs.mkdirSync(val, { recursive: true });
			return true;
		}
		catch (err) {
			log.warn('Cannot access directory', `${val}`);
			console.error(err);
			return false;
		}
	},
	idType: (val) => {
		const options = ['random', 'original', 'gfycat', 'timestamp', 'zws'];
		return options.includes(val);
	},
	idSize: numChecker,
	gfySize: numChecker,
	maximumFileSize: numChecker,

	s3: {
		endpoint: basicStringChecker,
		bucket: basicStringChecker,
		region: (val) => val == null || basicStringChecker(val),
		credentials: {
			accessKey: basicStringChecker,
			secretKey: basicStringChecker
		}
	},

	sql: {
		mySql: {
			host: basicStringChecker,
			user: basicStringChecker,
			password: basicStringChecker,
			database: basicStringChecker
		}
	}
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

		// * Base config
		if (!Checkers.uploadsDir(config.uploadsDir)) throw new Error(`Unable to access uploads directory: ${config.uploadsDir}`);
		if (!Checkers.idType(config.idType)) throw new Error(`Invalid ID type: ${config.idType}`);
		if (!Checkers.idSize(config.idSize)) throw new Error('Invalid ID size');
		if (!Checkers.gfySize(config.gfySize)) throw new Error('Invalid Gfy size');
		if (!Checkers.maximumFileSize(config.maximumFileSize)) throw new Error('Invalid maximum file size');

		// * Optional S3 config
		if (config.s3 != null) {
			if (!Checkers.s3.endpoint(config.s3.endpoint)) throw new Error('Invalid S3 Endpoint');
			if (!Checkers.s3.bucket(config.s3.bucket)) throw new Error('Invalid S3 Bucket');
			if (!Checkers.s3.region(config.s3.region)) throw new Error('Invalid S3 Region');
			if (!Checkers.s3.credentials.accessKey(config.s3.credentials.accessKey)) throw new Error('Invalid S3 Access key');
			if (!Checkers.s3.credentials.secretKey(config.s3.credentials.secretKey)) throw new Error('Invalid S3 Secret key');
		}

		// * Optional SQL config(s) (Currently only checks MySQL)
		if (config.sql?.mySql != null) {
			if (!Checkers.sql.mySql.host(config.sql.mySql.host)) throw new Error('Invalid MySql Host');
			if (!Checkers.sql.mySql.user(config.sql.mySql.user)) throw new Error('Invalid MySql User');
			if (!Checkers.sql.mySql.password(config.sql.mySql.password)) throw new Error('Invalid MySql Password');
			if (!Checkers.sql.mySql.database(config.sql.mySql.database)) throw new Error('Invalid MySql Database');
		}

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
