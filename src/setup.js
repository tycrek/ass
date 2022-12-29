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
	resourceIdType: 'random',
	spaceReplace: '_',
	mediaStrict: false,
	viewDirect: false,
	useIdInViewer: false,
	idInViewerExtension: false,
	dataEngine: '@tycrek/papito',
	frontendName: 'ass-x',
	savePerDay: false,
	allowRegistrations: false,
	adminWebhookEnabled: false,
	s3enabled: false,
};

// Default admin webhook
const adminWebhookConfig = {
	adminWebhookUrl: '',
	adminWebhookUsername: '',
	adminWebhookAvatar: '',
}

// Default S3 config
const s3config = {
	s3endpoint: 'sfo3.digitaloceanspaces.com',
	s3bucket: 'bucket-name',
	s3usePathStyle: false,
	s3accessKey: 'accessKey',
	s3secretKey: 'secretKey',
};

// Redacted configs from previous versions
const oldConfig = {
	// Note for people manually editing config.json
	__WARNING__: "The following configs are no longer used and are here for backwards compatibility. For optimal use, DO NOT edit them.",

	// Removed in 0.8.4
	diskFilePath: 'uploads/',
	saveWithDate: true, // Some systems don't like dirs with massive amounts of files
	saveAsOriginal: false, // Prone to conflicts, which ass doesn't handle
	useSia: false, // Sia has been shut down in 2022, uploads fail as of 2022-12-26
};

function getConfirmSchema(description) {
	return {
		properties: {
			confirm: {
				description,
				type: 'string',
				pattern: /^[y|n]/gim,
				message: 'Must respond with either \'y\' or \'n\'',
				required: true,
				before: (value) => value.toLowerCase().startsWith('y')
			}
		}
	};
}

// If directly called on the command line, run setup script
function doSetup() {
	const path = (...paths) => require('path').join(process.cwd(), ...paths);
	const { TLog, getChalk } = require('@tycrek/log');
	const fs = require('fs-extra');
	const prompt = require('prompt');
	const token = require('./generators/token');

	const log = new TLog({ level: 'debug', timestamp: { enabled: false } });

	// Override default configs with existing configs to allow migrating configs
	// Now that's a lot of configs!
	try {
		const existingConfig = require('../config.json');
		Object.entries(existingConfig).forEach(([key, value]) => {
			Object.prototype.hasOwnProperty.call(config, key) && (config[key] = value); // skipcq: JS-0093
			Object.prototype.hasOwnProperty.call(adminWebhookConfig, key) && (adminWebhookConfig[key] = value); // skipcq: JS-0093
			Object.prototype.hasOwnProperty.call(s3config, key) && (s3config[key] = value); // skipcq: JS-0093
			Object.prototype.hasOwnProperty.call(oldConfig, key) && (oldConfig[key] = value); // skipcq: JS-0093
		});
	} catch (ex) {
		if (ex.code !== 'MODULE_NOT_FOUND' && !ex.toString().includes('Unexpected end')) log.error(ex);
	}

	// Disabled the annoying "prompt: " prefix and removes colours
	prompt.message = '';
	prompt.colors = false;
	prompt.start();

	// Schema for setup prompts
	const setupSchema = {
		properties: {
			host: {
				description: 'Local IP to bind to',
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
				required: false,
				message: 'You must input a valid domain name or IP to continue'
			},
			maxUploadSize: {
				description: `Maximum size for uploaded files, in megabytes`,
				type: 'integer',
				default: config.maxUploadSize,
				require: false
			},
			isProxied: {
				description: 'Will you be running through a reverse proxy',
				type: 'boolean',
				default: config.isProxied,
				required: false
			},
			useSsl: {
				description: 'Use HTTPS (must be configured with reverse proxy)',
				type: 'boolean',
				default: config.useSsl,
				required: false
			},
			resourceIdSize: {
				description: 'URL length (length of ID\'s for your files, recommended: 6-15. Higher = more uploads, but longer URLs)',
				type: 'integer',
				default: config.resourceIdSize,
				required: false
			},
			resourceIdType: {
				description: 'URL type (can be one of: zws, random, gfycat, original, timestamp)',
				type: 'string',
				default: config.resourceIdType,
				require: false,
				pattern: /(original|zws|random|gfycat|timestamp)/gi, // skipcq: JS-0113
				message: 'Must be one of: zws, random, gfycat, original, timestamp'
			},
			spaceReplace: {
				description: 'Character to replace spaces in filenames with (must be a hyphen -, underscore _, or use ! to remove spaces)',
				type: 'string',
				default: config.spaceReplace,
				required: false,
				pattern: /^[-_!]$/gim,
				message: 'Must be a - , _ , or !'
			},
			gfyIdSize: {
				description: 'Adjective count for "gfycat" URL type',
				type: 'integer',
				default: config.gfyIdSize,
				required: false
			},
			mediaStrict: {
				description: 'Only allow uploads of media files (images, videos, audio)',
				type: 'boolean',
				default: config.mediaStrict,
				required: false
			},
			viewDirect: {
				description: 'View uploads in browser as direct resource, rather than a viewing page',
				type: 'boolean',
				default: config.viewDirect,
				required: false
			},
			useIdInViewer: {
				description: 'Use the ID in the web viewer instead of the filename',
				type: 'boolean',
				default: config.useIdInViewer,
				required: false
			},
			idInViewerExtension: {
				description: '(Only applies if "useIdInViewer" is true) Include the file extension in the ID in the web viewer',
				type: 'boolean',
				default: config.idInViewerExtension,
				required: false
			},
			dataEngine: {
				description: 'Data engine to use (must match an npm package name. If unsure, leave blank)',
				type: 'string',
				default: config.dataEngine,
				required: false
			},
			frontendName: {
				description: 'Name of your frontend (leave blank if not using frontends)',
				type: 'string',
				default: config.frontendName,
				required: false
			},
			savePerDay: {
				description: 'Save uploads in folders by day (YYYY-MM-DD) instead of by month (YYYY-MM)',
				type: 'boolean',
				default: config.savePerDay,
				required: false
			},
			allowRegistrations: {
				description: 'Allow public registration of accounts via API. (Admins are always allowed to do this)',
				type: 'boolean',
				default: config.allowRegistrations,
				required: false
			},
			adminWebhookEnabled: {
				description: 'Enable admin Discord webhook (This will let you audit ALL uploads, from ALL users)',
				type: 'boolean',
				default: config.adminWebhookEnabled,
				required: false
			},
			s3enabled: {
				description: 'Enable uploading to S3 storage endpoints',
				type: 'boolean',
				default: config.s3enabled,
				required: false
			}
		}
	};

	const adminWebhookSchema = {
		properties: {
			adminWebhookUrl: {
				description: 'Discord webhook URL for admin notifications',
				type: 'string',
				default: adminWebhookConfig.adminWebhookUrl,
				required: true
			},
			adminWebhookUsername: {
				description: 'Username to send the webhook as',
				type: 'string',
				default: adminWebhookConfig.adminWebhookUsername,
				required: false
			},
			adminWebhookAvatar: {
				description: 'Avatar to use for the webhook icon',
				type: 'string',
				default: adminWebhookConfig.adminWebhookAvatar,
				required: false
			}
		}
	};

	const s3schema = {
		properties: {
			s3endpoint: {
				description: 'S3 Endpoint URL to upload objects to',
				type: 'string',
				default: s3config.s3endpoint,
				required: false
			},
			s3bucket: {
				description: 'S3 Bucket name to upload objects to',
				type: 'string',
				default: s3config.s3bucket,
				required: false
			},
			s3usePathStyle: {
				description: 'S3 path endpoint, otherwise uses subdomain endpoint',
				type: 'boolean',
				default: s3config.s3usePathStyle,
				required: false
			},
			s3accessKey: {
				description: 'Access key for the specified S3 API',
				type: 'string',
				default: s3config.s3accessKey,
				required: false
			},
			s3secretKey: {
				description: 'Secret key for the specified S3 API',
				type: 'string',
				default: s3config.s3secretKey,
				required: false
			},
		}
	};

	// Schema for confirm prompt. User must enter 'y' or 'n' (case-insensitive)
	const confirmSchema = getConfirmSchema('\nIs the above information correct? (y/n)');

	log.blank().blank().blank().blank()
		.info('<<< ass setup >>>').blank();
	let results = {};
	prompt.get(setupSchema)
		.then((r) => results = r) // skipcq: JS-0086

		// Check if using admin webhook
		.then(() => results.adminWebhookEnabled ? prompt.get(adminWebhookSchema) : adminWebhookConfig) // skipcq: JS-0229
		.then((r) => Object.entries(r).forEach(([k, v]) => results[k] = v)) // skipcq: JS-0086
		// Check if using S3
		.then(() => results.s3enabled ? prompt.get(s3schema) : s3config) // skipcq: JS-0229
		.then((r) => Object.entries(r).forEach(([k, v]) => results[k] = v)) // skipcq: JS-0086

		// Verify information is correct
		.then(() => log
			.blank()
			.info('Please verify your information', '\n'.concat(Object.entries(results).map(([setting, value]) => `${'            '}${getChalk().dim.gray('-->')} ${getChalk().bold.white(`${setting}:`)} ${getChalk().white(value)}`).join('\n')))
			.blank())

		// Apply old configs
		.then(() => Object.entries(oldConfig).forEach(([setting, value]) => (typeof results[setting] === 'undefined') && (results[setting] = value)))

		// Confirm
		.then(() => prompt.get(confirmSchema))
		.then(({ confirm }) => (confirm ? fs.writeJson(path('config.json'), results, { spaces: 4 }) : log.error('Setup aborted').callback(process.exit, 1)))

		// Other setup tasks
		.then(() => {

			// Make sure auth.json exists and generate the first key
			if (!fs.existsSync(path('auth.json')) || fs.readFileSync(path('auth.json')).length < 8) {
				let users = {};
				users[token()] = { username: 'ass', count: 0 };
				fs.writeJsonSync(path('auth.json'), { users }, { spaces: 4 });
				log.debug('File created', 'auth.json')
					.success('!! Important', `Save this token in a secure spot: ${Object.keys(users)[0]}`)
					.blank();
			}

			let existingData = {}
			try {
				existingData = fs.readJsonSync(path('data.json'));
			} catch (ex) {
				log.warn('data.json', 'File empty, fixing')
			}

			// All 3 as a Promise.all
			return Promise.all([
				fs.ensureDir(path('share')),
				fs.ensureDir(path(results.diskFilePath, 'thumbnails')),
				fs.writeJson(path('data.json'), existingData, { spaces: 4 })
			]);
		})

		// Complete & exit
		.then(() => log.blank().success('Setup complete').callback(() => process.exit(0)))
		.catch((err) => log.blank().error(err).callback(() => process.exit(1)));
}

module.exports = {
	doSetup,
	config
};

// If called on the command line, run the setup.
// Using this makes sure setup is not run when imported by another file
if (require.main === module) {
	doSetup();
}

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
