import { BusBoyFile } from 'ass';
import { Request, Response } from 'express';

declare module 'express-session' {
	interface SessionData {
		ass: {
			auth?: {
				uid: string;
				token: string;
			}
			preLoginPath?: string;
		}
	}
}

declare global {
	namespace Express {
		interface Request {

			/**
			 * ass-specific request items
			 */
			ass: {

				/**
				 * Combination of {protocol}://{hostname}
				 */
				host: string

				/**
				 * ass version
				 */
				version: string
			}

			files: { [key: string]: BusBoyFile }
		}
	}
}
