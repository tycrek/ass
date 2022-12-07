/**
 * Developer API
 * - Users
 * - Resources
 */

import { Router, Request, Response, NextFunction } from 'express';
import { findFromToken, users } from '../auth';
import { data } from '../data';

const RouterApi = Router();
const RouterUser = Router();
const RouterResource = Router();

/**
 * Token authentication middleware
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const user = findFromToken(req.headers.authorization ?? '');
	(user && user.admin)
		? next()
		: res.sendStatus(401);
};

export const onStart = () => {
	RouterApi.use('/user', RouterUser);
	RouterApi.use('/resource', RouterResource);

	return RouterApi;
};
