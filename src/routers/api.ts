/**
 * Developer API
 * - Users
 * - Resources
 */

import { Router, Request, Response, NextFunction } from 'express';
import { findFromToken, users } from '../auth';
import { data } from '../data';
import { User } from '../types/auth';

/**
 * The primary API router
 */
const RouterApi = Router();

/**
 * Token authentication middleware for Admins
 */
const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const user = findFromToken(req.headers.authorization ?? '');
	(user && user.admin) ? next() : res.sendStatus(401);
};
function buildUserRouter() {
	const userRouter = Router();

	return userRouter;
}

function buildResourceRouter() {
	const resourceRouter = Router();

	return resourceRouter;
}

export const onStart = () => {
	RouterApi.use('/user', buildUserRouter());
	RouterApi.use('/resource', buildResourceRouter());

	return RouterApi;
};
