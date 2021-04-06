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
	resourceIdSize: 12,
	//resourceIdType: original/zws/random
};

// Schema for setup prompts
const setupSchema = {
	properties: {
		host: {
			description: `Local IP to listen on`,
			type: 'string',
			default: config.host,
			required: false
		},
		port: {
			description: `Port number to listen on`,
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
			description: `Use SSL (requires reverse proxy!)`,
			type: 'boolean',
			default: config.useSsl,
			required: false
		},
		resourceIdSize: {
			description: `Resource ID size (by using a higher value, you will be able to upload more files)`,
			type: 'integer',
			default: config.resourceIdSize,
			required: false
		}
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
	log('<<< anssxustawai setup >>>\n');
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
