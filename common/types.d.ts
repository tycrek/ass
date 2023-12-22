declare module 'ass' {
	type NID = string;

	type IdType = 'random' | 'original' | 'gfycat' | 'timestamp' | 'zws'

	export type DatabaseValue = AssFile | AssUser | UploadToken;
	export type DatabaseTable = 'assfiles' | 'assusers' | 'asstokens';

	/**
	 * Core Express server config.
	 * This is separate from the user configuration starting in 0.15.0
	 */
	interface ServerConfiguration {
		host: string;
		port: number;
		proxied: boolean;
	}

	/**
	 * User-defined configuration
	 */
	interface UserConfiguration {
		uploadsDir: string;
		idType: IdType;
		idSize: number;
		gfySize: number;
		maximumFileSize: number;
		discordWebhook: string;

		s3?: S3Configuration;
		database?: DatabaseConfiguration;

		rateLimit?: RateLimitConfiguration;
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

	/**
	 * interface for database classes
	 */

	export interface Database {
		/**
		 * preform database initialization tasks
		 */
		open(): Promise<void>;

		/**
		 * preform database suspension tasks
		 */
		close(): Promise<void>;

		/**
		 * set up database
		 */
		configure(): Promise<void>;

		/**
		 * put a value in the database
		 */
		put(table: DatabaseTable, key: NID, data: DatabaseValue): Promise<void>;

		/**
		 * get a value from the database
		 */
		get(table: DatabaseTable, key: NID): Promise<DatabaseValue>;

		/**
		 * get all values from the database
		 */
		getAll(table: DatabaseTable): Promise<DatabaseValue[]>;
	}

	interface DatabaseConfiguration {
		kind: 'mysql' | 'postgres' | 'json';
		options?: MySQLConfiguration | PostgresConfiguration;
	}

	interface MySQLConfiguration {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
	}

	interface PostgresConfiguration {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
	}

	/**
	 * rate limiter configuration
	 * @since  0.15.0
	 */
	interface RateLimitConfiguration {
		/**
		 * rate limit for the login endpoints
		 */
		login?: EndpointRateLimitConfiguration;

		/**
		 * rate limit for parts of the api not covered by other rate limits
		 */
		api?: EndpointRateLimitConfiguration;

		/**
		 * rate limit for file uploads
		 */
		upload?: EndpointRateLimitConfiguration;
	}

	/**
	 * rate limiter per-endpoint configuration
	 * @since 0.15.0
	 */
	interface EndpointRateLimitConfiguration {
		/**
		 * maximum number of requests per duration
		 */
		requests: number;

		/**
		 * rate limiting window in seconds
		 */
		duration: number;
	}

	interface UserConfigTypeChecker {
		uploadsDir: (val: any) => boolean;
		idType: (val: any) => boolean;
		idSize: (val: any) => boolean;
		gfySize: (val: any) => boolean;
		maximumFileSize: (val: any) => boolean;
		discordWebhook: (val: any) => boolean;
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
				port: (val: any) => boolean;
				user: (val: any) => boolean;
				password: (val: any) => boolean;
				database: (val: any) => boolean;
			}
			postgres: {
				port: (val: any) => boolean;
			}
		}
		rateLimit: {
			endpoint: (val: any) => boolean;
		}
	}

	/**
	 * The in-progress structure of a file being uploaded (pre-ass processing)
	 */
	interface BusBoyFile {
		uuid: string;
		field: string;
		/**
		 * Absolute path to the temporary file on-disk
		 */
		file: string;
		filename: string;
		encoding: string;
		mimetype: string;
		truncated: boolean;
		done: boolean;
	}

	/**
	 * Object describing the file as ass handles it (after BusBoy)
	 */
	interface AssFile {
		/**
		 * Public identifier used in the URL
		 */
		fakeid: NID;
		/**
		 * Unique-but-human-readable ID. Combination of Epoch and filename.
		 * This allows users to search for their file while also avoiding conflicts.
		 */
		fileKey: string;
		/**
		 * The original filename when it was uploaded by the user
		 */
		filename: string;
		mimetype: string;
		save: {
			local?: string;
			s3?: {
				privateUrl?: string;
				publicUrl?: string;
				thumbnailUrl?: string;
			} | true;
		}
		sha256: string;
		size: number;
		timestamp: string;
		uploader: NID;
	}

	/**
	 * Structure of a token in 0.15.0, allowing more fancy features, maybe
	 */
	interface UploadToken {
		/**
		 * Token ID to link it to a user
		 */
		id: NID;
		/**
		 * The token itself. The user will need this for upload auth.
		 */
		token: string;
		/**
		 * Helps the user know what this token is used for
		 */
		hint: string;
	}

	/**
	 * Object describing the users of an ass instance
	 */
	interface AssUser {
		id: NID;
		username: string;
		password: string;
		admin: boolean
		tokens: NID[];
		files: NID[];
		meta: { [key: string]: any };
	}

	interface AssUserNewReq {
		username: string;
		password: string;
		admin?: boolean;
		meta?: { [key: string]: any };
	}

	/**
	 * JSON schema for files.json
	 */
	interface FilesSchema {
		files: {
			[key: NID]: AssFile;
		}
		meta: { [key: string]: any };
	}

	/**
	 * JSON scheme for users.json
	 */
	interface UsersSchema {
		tokens: UploadToken[];
		users: {
			[key: NID]: AssUser;
		};
		cliKey: string;
		meta: { [key: string]: any };
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
