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

		s3?: S3Configuration;
		sql?: SqlConfiguration;
	}

	interface S3Configuration {
		/**
		 * S3 endpoint to use
		 */
		endpoint: string;
		/**
		 * Bucket to upload to
		*/
		bucket: string;
		/**
		 * Optional region. Required for some providers
		 */
		region?: string;
		/**
		 * Access credentials
		 */
		credentials: {
			accessKey: string;
			secretKey: string;
		}
	}

	interface SqlConfiguration {
		mySql?: {
			host: string;
			user: string;
			password: string;
			database: string;
		}
	}

	interface UserConfigTypeChecker {
		uploadsDir: (val: any) => boolean;
		idType: (val: any) => boolean;
		idSize: (val: any) => boolean;
		gfySize: (val: any) => boolean;
		maximumFileSize: (val: any) => boolean;
		s3: {
			endpoint: (val: any) => boolean;
			bucket: (val: any) => boolean;
			region: (val: any) => boolean;
			credentials: {
				accessKey: (val: any) => boolean;
				secretKey: (val: any) => boolean;
			}
		}
		sql: {
			mySql: {
				host: (val: any) => boolean;
				user: (val: any) => boolean;
				password: (val: any) => boolean;
				database: (val: any) => boolean;
			}
		}
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
		fileKey: string;
		mimetype: string;
		filename: string;
		save: {
			local?: string;
			s3?: {
				privateUrl?: string;
				publicUrl?: string;
				thumbnailUrl?: string;
			} | true;
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
