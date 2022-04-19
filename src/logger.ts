import { TLog, DateTimePreset } from '@tycrek/log';

// Set up logging
const logger = new TLog({
	// @ts-ignore
	level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
	timestamp: {
		enabled: true,
		colour: 'grey',
		preset: DateTimePreset.DATETIME_MED
	}
});

// Enable the Express logger
logger.enable.express({
	middleware: {
		excludePaths: ['favicon.ico'],
	},
	trim: {
		enabled: true,
		maxLength: 80,
		delim: ': ',
	},
	handle404: true,
	handle500: false
}).debug('Plugin enabled', 'Express');

/**
 * @type {TLog}
 */
// yeet


export default logger;