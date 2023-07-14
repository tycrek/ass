declare module 'ass' {
	type NID = string;

	type IdType = 'random' | 'original' | 'gfycat' | 'timestamp' | 'zws'

	/**
	 * Core Express server config.
	 * This is separate from the user configuration starting in 0.15.0
	 */
	interface ServerConfiguration {
		host: string;
		port: number;
		proxied: boolean;
	}

	interface UserConfiguration {
		uploadsDir: string;
		idType: IdType;
		idSize: number;
		gfySize: number;
		maximumFileSize: number;
	}

	interface UserConfigTypeChecker {
		uploadsDir: (val: any) => boolean;
		idType: (val: any) => boolean;
		idSize: (val: any) => boolean;
		gfySize: (val: any) => boolean;
		maximumFileSize: (val: any) => boolean;
	}

	interface BusBoyFile {
		uuid: string;
		field: string;
		file: string;
		filename: string;
		encoding: string;
		mimetype: string;
		truncated: boolean;
		done: boolean;
	}

	interface AssFile {
		fakeid: string;
		id: NID;
		mimetype: string;
		filename: string;
		save: {
			local?: string;
			s3?: any;
		}
		sha256: string;
		timestamp: string;
		uploader: NID;
	}
}

//#region Dummy modules
declare module '@tinycreek/postcss-font-magician';
//#endregion

// don't commit
/* future UserConfig options:
	mediaStrict: boolean;
	viewDirect: boolean;
	viewDirectDiscord: boolean;
	adminWebhook: {}
	s3: {}
*/
