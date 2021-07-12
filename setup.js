// Default configuration
const config = {
	host: '0.0.0.0',
	port: 40115,
	domain: 'upload.example.com',
	maxUploadSize: 50,
	useSsl: true,
	isProxied: true,
	resourceIdSize: 12,
	gfyIdSize: 2,
	resourceIdType: 'zws',
	diskFilePath: 'uploads/',
	saveWithDate: false,
	saveAsOriginal: true,
	mediaStrict: false,
	s3enabled: false,
	s3endpoint: 'sfo3.digitaloceanspaces.com',
	s3bucket: 'bucket-name',
	s3bucketEndpoint: false,
	s3accessKey: 'accessKey',
	s3secretKey: 'secretKey',
};

// If directly called on the command line, run setup script
if (require.main === module) {
	const TLog = require('@tycrek/log');
	const path = (...paths) => require('path').join(__dirname, ...paths);
	const fs = require('fs-extra');
	const prompt = require('prompt');

	const log = new TLog({ timestamp: { enabled: false } });

	// Override default config with existing config to allow migrating configs
	try {
		const existingConfig = require('./config.json');
		Object.keys(existingConfig).forEach((key) => Object.prototype.hasOwnProperty.call(config, key) && (config[key] = existingConfig[key]))
	} catch (ex) {
		if (ex.code !== 'MODULE_NOT_FOUND') log.error(ex);
	}

	// Disabled the annoying "prompt: " prefix and removes colours
	prompt.message = '';
	prompt.colors = false;
	prompt.start();

	// Schema for setup prompts
	const setupSchema = {
		properties: {
			host: {
				description: 'Local IP to listen on',
				type: 'string',
				default: config.host,
				required: false
			},
			port: {
				description: 'Port number to listen on',
				type: 'integer',
				default: config.port,
				required: false
			},
			domain: {
				description: `Domain name to send to ShareX clients (example: ${config.domain})`,
				type: 'string',
				required: true,
				message: 'You must input a valid domain name or IP to continue'
			},
			maxUploadSize: {
				description: `Max allowable uploaded filesize, in megabytes`,
				type: 'integer',
				default: config.maxUploadSize,
				require: false
			},
			useSsl: {
				description: 'Use SSL (requires reverse proxy!)',
				type: 'boolean',
				default: config.useSsl,
				required: false
			},
			isProxied: {
				description: 'Will you be running through a reverse proxy',
				type: 'boolean',
				default: config.isProxied,
				required: false
			},
			resourceIdSize: {
				description: 'Resource ID length (length of ID\'s for your files, recommended: 6-15. Higher = more uploads)',
				type: 'integer',
				default: config.resourceIdSize,
				required: false
			},
			resourceIdType: {
				description: 'Resource ID type (determines what kind of URL your uploads are visible at. Can be one of: original, zws, random, gfycat)',
				type: 'string',
				default: config.resourceIdType,
				require: false,
				pattern: /(original|zws|random|gfycat)/gi, // skipcq: JS-0113
				message: 'Must be one of: original, zws, random, gfycat'
			},
			gfyIdSize: {
				description: 'Adjective count for "gfycat" Resource ID type',
				type: 'integer',
				default: config.gfyIdSize,
				required: false
			},
			diskFilePath: {
				description: 'Relative path to save uploads to',
				type: 'string',
				default: config.diskFilePath,
				required: false
			},
			saveWithDate: {
				description: 'Use date folder structure (e.x. uploads/2021-04/image.png)',
				type: 'boolean',
				default: config.saveWithDate,
				required: false
			},
			saveAsOriginal: {
				description: 'Save as original file name instead of random',
				type: 'boolean',
				default: config.saveAsOriginal,
				required: false
			},
			mediaStrict: {
				description: 'Only allow uploads of media files (images, videos, audio)',
				type: 'boolean',
				default: config.mediaStrict,
				required: false
			},
			s3enabled: {
				description: 'Enable uploading to S3 storage endpoints',
				type: 'boolean',
				default: config.s3enabled,
				required: false
			},
			s3endpoint: {
				description: 'S3 Endpoint URL to upload objects to',
				type: 'string',
				default: config.s3endpoint,
				required: false
			},
			s3bucket: {
				description: 'S3 Bucket name to upload objects to',
				type: 'string',
				default: config.s3bucket,
				required: false
			},
			s3bucketEndpoint: {
				description: 'Whether the provided endpoint is a bucket path (true) or a bucket subdomain (false)',
				type: 'boolean',
				default: config.s3bucketEndpoint,
				required: false
			},
			s3accessKey: {
				description: 'Access key for the specified S3 API',
				type: 'string',
				default: config.s3accessKey,
				required: false
			},
			s3secretKey: {
				description: 'Secret key for the specified S3 API',
				type: 'string',
				default: config.s3secretKey,
				required: false
			},
		}
	};

	// Schema for confirm prompt. User must enter 'y' or 'n' (case-insensitive)
	const confirmSchema = {
		properties: {
			confirm: {
				description: '\nIs the above information correct? (y/n)',
				type: 'string',
				pattern: /^[y|n]/gim,
				message: 'Must respond with either \'y\' or \'n\'',
				default: 'y',
				required: false,
				before: (value) => value.toLowerCase().startsWith('y')
			}
		}
	};

	log.blank().blank().blank().blank()
		.info('<<< ass setup >>>').blank();
	let results = {};
	prompt.get(setupSchema)
		.then((r) => results = r) // skipcq: JS-0086
		/* .then(() => log.blank().warn('Please verify your information', ''))
		.then(() => Object.entries(results).forEach(([setting, value]) => log.info(`--> ${setting}`, `${value}`)))
		.then(() => log.blank()) */

		.then(() => log
			.blank()
			.warn('Please verify your information', '')
			.callback(() => Object.entries(results).forEach(([setting, value]) => log.info(`--> ${setting}`, `${value}`)))
			.blank())

		.then(() => prompt.get(confirmSchema))
		.then(({ confirm }) => (confirm ? fs.writeJson(path('config.json'), results, { spaces: 4 }) : process.exit(1)))
		.then(() => log.blank().success('Config has been saved!'))
		.catch((err) => log.blank().error(err));
}

module.exports = config;

/*{
	description: 'Enter your password',     // Prompt displayed to the user. If not supplied name will be used.
	type: 'string',                 // Specify the type of input to expect.
	pattern: /^\w+$/,                  // Regular expression that input must be valid against.
	message: 'Password must be letters', // Warning message to display if validation fails.
	hidden: true,                        // If true, characters entered will either not be output to console or will be outputed using the `replace` string.
	replace: '*',                        // If `hidden` is set it will replace each hidden character with the specified string.
	default: 'lamepassword',             // Default value to use if no value is entered.
	required: true,                  // If true, value entered must be non-empty.
	before: function (value) { return 'v' + value; } // Runs before node-prompt callbacks. It modifies user's input
}*/
