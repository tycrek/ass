/**
 * Used for global auth management
 */

import fs from 'fs-extra';
import { log, path, arrayEquals } from './utils';

export const users = require('../auth.json').users || {};

// Monitor auth.json for changes (triggered by running 'npm run new-token')
fs.watch(path('auth.json'), { persistent: false },
	(eventType: String) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json: { users: JSON[] }) => {
			if (!(arrayEquals(Object.keys(users), Object.keys(json.users)))) {
				// @ts-ignore
				Object.keys(json.users).forEach((token) => (!Object.prototype.hasOwnProperty.call(users, token)) && (users[token] = json.users[token]));
				log.info('New token added', Object.keys(users)[Object.keys(users).length - 1] || 'No new token');
			}
		})
		.catch(log.c.error));
