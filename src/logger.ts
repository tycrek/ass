import { TLog } from '@tycrek/log';
import { DateTime } from 'luxon';

// Set up logging
const logger = new TLog(process.env.NODE_ENV === 'production' ? 'info' : 'debug')
	.setTimestamp({ preset: DateTime.DATETIME_MED });

// todo: re-enable the Express logger

export default logger;
