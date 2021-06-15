const { path, log } = require('./utils');
const fs = require('fs-extra');
const prompt = require('prompt');

// Disabled the annoying "prompt: " prefix and removes colours
prompt.message = '';
prompt.colors = false;
prompt.start();

// Default configuration
const config = {
	host: '0.0.0.0',
	port: 40115,
	domain: 'upload.example.com',
	useSsl: true,
	isProxied: true,
	resourceIdSize: 12,
	gfyIdSize: 2,
	resourceIdType: 'zws',
	diskFilePath: "uploads/",
	saveWithDate: false,
	saveAsOriginal: true,
};

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
			description: 'Resource ID size (by using a higher value, you will be able to upload more files)',
			type: 'integer',
			default: config.resourceIdSize,
			required: false
		},
		gfyIdSize: {
			description: 'Adjective count for "gfycat" resource mode',
			type: 'integer',
			default: config.gfyIdSize,
			required: false
		},
		resourceIdType: {
			description: 'Resource ID type (determines what kind of URL your uploads are visible at. Can be one of: original, zws, random)',
			type: 'string',
			default: config.resourceIdType,
			require: false,
			pattern: /(original|zws|random|gfycat)/gi,
			message: 'Must be one of: original, zws, random, gfycat'
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

function setup() {
	log('<<< ass setup >>>\n');
	let results;
	prompt.get(setupSchema)
		.then((r) => results = r)
		.then(() => log('\nPlease verify your information:\n\n' + Object.keys(results).map((result) => (` ${result}: ${results[result]}`)).join('\n') + '\n'))
		.then(() => prompt.get(confirmSchema))
		.then(({ confirm }) => confirm ? fs.writeJson(path('config.json'), results, { spaces: 4 }) : process.exit(1))
		.then(() => log('\nConfig has been saved!'))
		.catch((err) => console.error(err));
}

setup();

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
