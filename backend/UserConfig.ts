import fs from 'fs-extra';
import { UserConfiguration, UserConfigTypeChecker } from 'ass';

/**
 * Returns a boolean if the provided value is a number
 */
const numChecker = (val: string) => {
	try { parseInt(val); return true; }
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
	private config: UserConfiguration;
	public getConfig = () => this.config;

	constructor(config?: UserConfiguration) {
		if (config != null) this.config = this.parseConfig(config);
	}

	private parseConfig(config: UserConfiguration) {
		if (!Checkers.uploadsDir(config.uploadsDir)) throw new Error(`Unable to access uploads directory: ${config.uploadsDir}`);
		if (!Checkers.idType(config.idType)) throw new Error(`Invalid ID type: ${config.idType}`);
		if (!Checkers.idSize(config.idSize)) throw new Error(`Invalid ID size: ${config.idSize}`);
		if (!Checkers.gfySize(config.gfySize)) throw new Error(`Invalid Gfy size: ${config.gfySize}`);
		if (!Checkers.maximumFileSize(config.maximumFileSize)) throw new Error(`Invalid maximum file size: ${config.maximumFileSize}`);

		// All is fine, carry on!
		return config;
	}
}
