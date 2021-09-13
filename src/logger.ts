const TLog = require('@tycrek/log');

// Set up logging
const logger = new TLog({
	level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
	timestamp: {
		enabled: true,
		colour: 'grey',
		preset: 'DATETIME_MED'
	},
});

// Enable the Express logger
logger.enable.express({ handle500: false }).debug('Plugin enabled', 'Express');

/**
 * @type {TLog}
 */
// yeet


export default logger;