/**
 * Used for global data management
 */

import fs from 'fs-extra';
import { Config } from 'ass-json';
import { JsonDataEngine } from '@tycrek/papito'

let theData: any;

/**
 * Called by ass.ts on startup
 * @since v0.14.2
 */
export const onStart = () => new Promise((resolve, reject) => {
	// Actual data engine
	const { dataEngine }: Config = fs.readJsonSync('config.json');
	import(dataEngine)
		.then(({ _ENGINE_ }) => theData = _ENGINE_(new JsonDataEngine()))
		.then(resolve)
		.catch(reject);
});

// Export a self-calling const function returning the data
export const data = ((): any => theData);
