import { Request, Response } from 'express';

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
            }
        }
    }
}
